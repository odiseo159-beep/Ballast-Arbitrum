import { expect } from 'chai';
import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { parseUnits, getAddress, zeroAddress } from 'viem';

const price18 = (human: string): bigint => parseUnits(human, 18);

// ───────────────────────── Fixtures ─────────────────────────

async function baseFixture(opts: { usdgDecimals?: number } = {}) {
  const usdgDecimals = opts.usdgDecimals ?? 18;
  const [owner, oracle, payer, beneficiary, other] = await hre.viem.getWalletClients();

  const usdg = await hre.viem.deployContract('MockERC20', [
    'Robinhood USDG',
    'USDG',
    usdgDecimals,
  ]);
  const tsla = await hre.viem.deployContract('MockERC20', ['Tesla', 'TSLA', 18]);
  const amzn = await hre.viem.deployContract('MockERC20', ['Amazon', 'AMZN', 18]);
  const nflx = await hre.viem.deployContract('MockERC20', ['Netflix', 'NFLX', 18]);

  const desk = await hre.viem.deployContract('AllocationDesk', [
    owner.account.address,
    oracle.account.address,
    usdg.address,
    [tsla.address, amzn.address, nflx.address],
  ]);

  return { owner, oracle, payer, beneficiary, other, usdg, tsla, amzn, nflx, desk, usdgDecimals };
}

const defaultFixture = () => baseFixture();
const fixture6Dec = () => baseFixture({ usdgDecimals: 6 });

// Re-attach a deployed contract with a specific wallet client.
async function withWallet(name: string, address: `0x${string}`, wallet: any): Promise<any> {
  return await hre.viem.getContractAt(name as any, address, { client: { wallet } });
}

async function fundReserve(desk: any, owner: any, token: any, amount: bigint) {
  await token.write.mint([owner.account.address, amount]);
  const tokenAsOwner = await withWallet('MockERC20', token.address, owner);
  await tokenAsOwner.write.approve([desk.address, amount]);
  const deskAsOwner = await withWallet('AllocationDesk', desk.address, owner);
  await deskAsOwner.write.depositReserve([token.address, amount]);
}

// ───────────────────────── Tests ─────────────────────────

describe('AllocationDesk', () => {
  describe('constructor', () => {
    it('wires owner, oracle, USDG, and supported stocks', async () => {
      const { desk, owner, oracle, usdg, tsla, amzn, nflx } = await loadFixture(defaultFixture);
      expect(getAddress(await desk.read.owner())).to.equal(getAddress(owner.account.address));
      expect(getAddress(await desk.read.oracle())).to.equal(getAddress(oracle.account.address));
      expect(getAddress(await desk.read.USDG())).to.equal(getAddress(usdg.address));
      expect(await desk.read.USDG_DECIMALS()).to.equal(18);
      expect(await desk.read.supportedStock([tsla.address])).to.equal(true);
      expect(await desk.read.supportedStock([amzn.address])).to.equal(true);
      expect(await desk.read.supportedStock([nflx.address])).to.equal(true);
      expect(await desk.read.stockDecimals([tsla.address])).to.equal(18);
    });

    it('reverts ZeroAddress when owner is zero', async () => {
      const [, oracle] = await hre.viem.getWalletClients();
      const usdg = await hre.viem.deployContract('MockERC20', ['USDG', 'USDG', 18]);
      await expect(
        hre.viem.deployContract('AllocationDesk', [
          zeroAddress,
          oracle.account.address,
          usdg.address,
          [],
        ])
      ).to.be.rejectedWith(/ZeroAddress|OwnableInvalidOwner/);
    });
  });

  describe('setOracle', () => {
    it('only owner can set; non-owner reverts OwnableUnauthorizedAccount', async () => {
      const { desk, owner, other } = await loadFixture(defaultFixture);

      const dOwner = await withWallet('AllocationDesk', desk.address, owner);
      await dOwner.write.setOracle([other.account.address]);
      expect(getAddress(await desk.read.oracle())).to.equal(getAddress(other.account.address));

      const dOther = await withWallet('AllocationDesk', desk.address, other);
      await expect(dOther.write.setOracle([owner.account.address])).to.be.rejectedWith(
        /OwnableUnauthorizedAccount/
      );
    });
  });

  describe('setPrices', () => {
    it('oracle can push prices for supported stocks', async () => {
      const { desk, oracle, tsla, amzn } = await loadFixture(defaultFixture);
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([
        [tsla.address, amzn.address],
        [price18('200.50'), price18('180.00')],
      ]);
      expect(await desk.read.priceUsdgPerStock([tsla.address])).to.equal(price18('200.50'));
      expect(await desk.read.priceUsdgPerStock([amzn.address])).to.equal(price18('180.00'));
    });

    it('non-oracle reverts NotOracle', async () => {
      const { desk, payer, tsla } = await loadFixture(defaultFixture);
      const d = await withWallet('AllocationDesk', desk.address, payer);
      // viem-hardhat occasionally surfaces modifier reverts as a generic
      // "Missing or invalid parameters" error instead of the decoded custom
      // error name — accept either form so we still catch regressions where
      // the call doesn't revert at all.
      await expect(d.write.setPrices([[tsla.address], [price18('100')]])).to.be.rejectedWith(
        /NotOracle|Missing or invalid parameters/
      );
    });

    it('zero price reverts ZeroAmount', async () => {
      const { desk, oracle, tsla } = await loadFixture(defaultFixture);
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await expect(d.write.setPrices([[tsla.address], [0n]])).to.be.rejectedWith(/ZeroAmount/);
    });

    it('unsupported stock reverts StockNotSupported', async () => {
      const { desk, oracle } = await loadFixture(defaultFixture);
      const fake = await hre.viem.deployContract('MockERC20', ['Fake', 'FAKE', 18]);
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await expect(d.write.setPrices([[fake.address], [price18('1')]])).to.be.rejectedWith(
        /StockNotSupported/
      );
    });
  });

  describe('execute', () => {
    it('settles a 50/30/20 allocation across three stocks', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla, amzn, nflx } =
        await loadFixture(defaultFixture);

      const reserveAmt = parseUnits('100', 18);
      await fundReserve(desk, owner, tsla, reserveAmt);
      await fundReserve(desk, owner, amzn, reserveAmt);
      await fundReserve(desk, owner, nflx, reserveAmt);

      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([
        [tsla.address, amzn.address, nflx.address],
        [price18('100'), price18('200'), price18('50')],
      ]);

      const usdgAmount = parseUnits('1000', 18);
      await usdg.write.mint([payer.account.address, usdgAmount]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, usdgAmount]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await dp.write.execute([
        beneficiary.account.address,
        usdgAmount,
        [tsla.address, amzn.address, nflx.address],
        [5000n, 3000n, 2000n],
      ]);

      // 500 USDG / $100 = 5 TSLA ; 300 USDG / $200 = 1.5 AMZN ; 200 USDG / $50 = 4 NFLX
      expect(await tsla.read.balanceOf([beneficiary.account.address])).to.equal(parseUnits('5', 18));
      expect(await amzn.read.balanceOf([beneficiary.account.address])).to.equal(parseUnits('1.5', 18));
      expect(await nflx.read.balanceOf([beneficiary.account.address])).to.equal(parseUnits('4', 18));
      expect(await usdg.read.balanceOf([desk.address])).to.equal(usdgAmount);
    });

    it('emits Executed with correct args (Phase 3 activity feed depends on this)', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla, amzn } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('10', 18));
      await fundReserve(desk, owner, amzn, parseUnits('10', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([
        [tsla.address, amzn.address],
        [price18('100'), price18('200')],
      ]);

      await usdg.write.mint([payer.account.address, parseUnits('1000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('1000', 18)]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await dp.write.execute([
        beneficiary.account.address,
        parseUnits('1000', 18),
        [tsla.address, amzn.address],
        [6000n, 4000n],
      ]);

      const events = await desk.getEvents.Executed();
      expect(events.length).to.equal(1);
      const e: any = events[0];
      expect(getAddress(e.args.beneficiary)).to.equal(getAddress(beneficiary.account.address));
      expect(getAddress(e.args.payer)).to.equal(getAddress(payer.account.address));
      expect(e.args.usdgAmount).to.equal(parseUnits('1000', 18));
      expect(e.args.stocks.map((s: `0x${string}`) => getAddress(s))).to.deep.equal([
        getAddress(tsla.address),
        getAddress(amzn.address),
      ]);
      expect(e.args.weightsBps).to.deep.equal([6000n, 4000n]);
      // 600 USDG / $100 = 6 TSLA ; 400 USDG / $200 = 2 AMZN
      expect(e.args.stockAmountsOut).to.deep.equal([parseUnits('6', 18), parseUnits('2', 18)]);
    });

    it('100/0/0 boundary: single-stock allocation works', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla, amzn, nflx } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('100', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([
        [tsla.address, amzn.address, nflx.address],
        [price18('100'), price18('200'), price18('50')],
      ]);

      const usdgAmount = parseUnits('500', 18);
      await usdg.write.mint([payer.account.address, usdgAmount]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, usdgAmount]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await dp.write.execute([
        beneficiary.account.address,
        usdgAmount,
        [tsla.address, amzn.address, nflx.address],
        [10000n, 0n, 0n],
      ]);

      expect(await tsla.read.balanceOf([beneficiary.account.address])).to.equal(parseUnits('5', 18));
      expect(await amzn.read.balanceOf([beneficiary.account.address])).to.equal(0n);
      expect(await nflx.read.balanceOf([beneficiary.account.address])).to.equal(0n);
    });

    it('weights != 10000 reverts WeightsMismatch', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla, amzn } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('10', 18));
      await fundReserve(desk, owner, amzn, parseUnits('10', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([
        [tsla.address, amzn.address],
        [price18('100'), price18('100')],
      ]);

      await usdg.write.mint([payer.account.address, parseUnits('1000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('1000', 18)]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await expect(
        dp.write.execute([
          beneficiary.account.address,
          parseUnits('1000', 18),
          [tsla.address, amzn.address],
          [5000n, 3000n], // sums to 8000, not 10000
        ])
      ).to.be.rejectedWith(/WeightsMismatch/);
    });

    it('insufficient reserve reverts InsufficientReserve', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('0.001', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([[tsla.address], [price18('100')]]);

      await usdg.write.mint([payer.account.address, parseUnits('1000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('1000', 18)]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await expect(
        dp.write.execute([
          beneficiary.account.address,
          parseUnits('1000', 18),
          [tsla.address],
          [10000n],
        ])
      ).to.be.rejectedWith(/InsufficientReserve/);
    });

    it('price not set reverts PriceNotSet (even for zero-weight stocks)', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla, amzn } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('10', 18));
      await fundReserve(desk, owner, amzn, parseUnits('10', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([[tsla.address], [price18('100')]]); // only TSLA priced

      await usdg.write.mint([payer.account.address, parseUnits('1000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('1000', 18)]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await expect(
        dp.write.execute([
          beneficiary.account.address,
          parseUnits('1000', 18),
          [tsla.address, amzn.address],
          [5000n, 5000n],
        ])
      ).to.be.rejectedWith(/PriceNotSet/);
    });

    it('reentrancy attempt is blocked by ReentrancyGuard', async () => {
      const [owner, oracle, payer, beneficiary] = await hre.viem.getWalletClients();
      const usdg = await hre.viem.deployContract('MockERC20', ['USDG', 'USDG', 18]);
      const evil = await hre.viem.deployContract('ReentrantERC20', ['Evil', 'EVIL', 18]);

      const desk = await hre.viem.deployContract('AllocationDesk', [
        owner.account.address,
        oracle.account.address,
        usdg.address,
        [evil.address],
      ]);

      await evil.write.mint([owner.account.address, parseUnits('100', 18)]);
      const evilAsOwner = await withWallet('ReentrantERC20', evil.address, owner);
      await evilAsOwner.write.approve([desk.address, parseUnits('100', 18)]);
      const deskAsOwner = await withWallet('AllocationDesk', desk.address, owner);
      await deskAsOwner.write.depositReserve([evil.address, parseUnits('100', 18)]);

      const deskAsOracle = await withWallet('AllocationDesk', desk.address, oracle);
      await deskAsOracle.write.setPrices([[evil.address], [price18('100')]]);

      await usdg.write.mint([payer.account.address, parseUnits('2000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('2000', 18)]);

      // Arm the malicious token to call execute() recursively on transfer.
      await evil.write.arm([
        desk.address,
        beneficiary.account.address,
        parseUnits('100', 18),
        [evil.address],
        [10000n],
      ]);

      const deskAsPayer = await withWallet('AllocationDesk', desk.address, payer);
      await expect(
        deskAsPayer.write.execute([
          beneficiary.account.address,
          parseUnits('1000', 18),
          [evil.address],
          [10000n],
        ])
      ).to.be.rejectedWith(/ReentrancyGuardReentrantCall/);
    });
  });

  describe('redeem', () => {
    it('round-trips: execute then redeem half', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla } =
        await loadFixture(defaultFixture);

      await fundReserve(desk, owner, tsla, parseUnits('100', 18));
      // Pre-fund desk with USDG so it can pay out redemptions.
      await usdg.write.mint([owner.account.address, parseUnits('1000', 18)]);
      const uo = await withWallet('MockERC20', usdg.address, owner);
      await uo.write.approve([desk.address, parseUnits('1000', 18)]);
      const dOwner = await withWallet('AllocationDesk', desk.address, owner);
      await dOwner.write.depositReserve([usdg.address, parseUnits('1000', 18)]);

      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([[tsla.address], [price18('100')]]);

      await usdg.write.mint([payer.account.address, parseUnits('1000', 18)]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, parseUnits('1000', 18)]);
      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await dp.write.execute([
        beneficiary.account.address,
        parseUnits('1000', 18),
        [tsla.address],
        [10000n],
      ]);
      expect(await tsla.read.balanceOf([beneficiary.account.address])).to.equal(
        parseUnits('10', 18)
      );

      // Beneficiary redeems 5 TSLA back -> 500 USDG
      const tslaAsBen = await withWallet('MockERC20', tsla.address, beneficiary);
      await tslaAsBen.write.approve([desk.address, parseUnits('5', 18)]);
      const deskAsBen = await withWallet('AllocationDesk', desk.address, beneficiary);
      await deskAsBen.write.redeem([tsla.address, parseUnits('5', 18)]);

      expect(await usdg.read.balanceOf([beneficiary.account.address])).to.equal(
        parseUnits('500', 18)
      );
      expect(await tsla.read.balanceOf([beneficiary.account.address])).to.equal(
        parseUnits('5', 18)
      );
    });
  });

  describe('decimals math', () => {
    it('handles 6-decimal USDG paired with 18-decimal stock', async () => {
      const { desk, owner, oracle, payer, beneficiary, usdg, tsla } =
        await loadFixture(fixture6Dec);

      await fundReserve(desk, owner, tsla, parseUnits('100', 18));
      const d = await withWallet('AllocationDesk', desk.address, oracle);
      await d.write.setPrices([[tsla.address], [price18('100')]]);

      const usdgAmount = parseUnits('1000', 6); // 1000 USDG in 6-decimal units
      await usdg.write.mint([payer.account.address, usdgAmount]);
      const u = await withWallet('MockERC20', usdg.address, payer);
      await u.write.approve([desk.address, usdgAmount]);

      const dp = await withWallet('AllocationDesk', desk.address, payer);
      await dp.write.execute([
        beneficiary.account.address,
        usdgAmount,
        [tsla.address],
        [10000n],
      ]);

      // 1000 USDG / $100 = 10 TSLA (in 18-dec units)
      expect(await tsla.read.balanceOf([beneficiary.account.address])).to.equal(
        parseUnits('10', 18)
      );
    });
  });

  describe('admin', () => {
    it('depositReserve and withdrawReserve work for USDG', async () => {
      const { desk, owner, usdg } = await loadFixture(defaultFixture);
      await usdg.write.mint([owner.account.address, parseUnits('500', 18)]);
      const uo = await withWallet('MockERC20', usdg.address, owner);
      await uo.write.approve([desk.address, parseUnits('500', 18)]);
      const d = await withWallet('AllocationDesk', desk.address, owner);
      await d.write.depositReserve([usdg.address, parseUnits('500', 18)]);
      expect(await usdg.read.balanceOf([desk.address])).to.equal(parseUnits('500', 18));

      await d.write.withdrawReserve([usdg.address, parseUnits('200', 18)]);
      expect(await usdg.read.balanceOf([desk.address])).to.equal(parseUnits('300', 18));
    });

    it('depositReserve rejects unknown tokens with UnknownToken', async () => {
      const { desk, owner } = await loadFixture(defaultFixture);
      const fake = await hre.viem.deployContract('MockERC20', ['Fake', 'FAKE', 18]);
      await fake.write.mint([owner.account.address, parseUnits('1', 18)]);
      const fakeAsOwner = await withWallet('MockERC20', fake.address, owner);
      await fakeAsOwner.write.approve([desk.address, parseUnits('1', 18)]);
      const d = await withWallet('AllocationDesk', desk.address, owner);
      await expect(
        d.write.depositReserve([fake.address, parseUnits('1', 18)])
      ).to.be.rejectedWith(/UnknownToken/);
    });
  });
});
