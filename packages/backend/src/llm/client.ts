import Anthropic from '@anthropic-ai/sdk';
import { ENV } from '../env.js';

export const anthropic = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });

export const MODEL = 'claude-sonnet-4-6';
