import { Injectable } from '@nestjs/common';

interface ModelPricing {
  inputPer1k: number;  // Cost per 1k input tokens
  outputPer1k: number; // Cost per 1k output tokens
}

@Injectable()
export class CostCalculator {
  private pricingTable: Map<string, ModelPricing> = new Map([
    // OpenAI GPT-4 models
    ['gpt-4', { inputPer1k: 0.03, outputPer1k: 0.06 }],
    ['gpt-4-turbo', { inputPer1k: 0.01, outputPer1k: 0.03 }],
    ['gpt-4-turbo-preview', { inputPer1k: 0.01, outputPer1k: 0.03 }],
    ['gpt-4-1106-preview', { inputPer1k: 0.01, outputPer1k: 0.03 }],

    // OpenAI GPT-3.5 models
    ['gpt-3.5-turbo', { inputPer1k: 0.0005, outputPer1k: 0.0015 }],
    ['gpt-3.5-turbo-16k', { inputPer1k: 0.003, outputPer1k: 0.004 }],

    // Anthropic Claude models
    ['claude-3-opus-20240229', { inputPer1k: 0.015, outputPer1k: 0.075 }],
    ['claude-3-sonnet-20240229', { inputPer1k: 0.003, outputPer1k: 0.015 }],
    ['claude-3-haiku-20240307', { inputPer1k: 0.00025, outputPer1k: 0.00125 }],
    ['claude-2.1', { inputPer1k: 0.008, outputPer1k: 0.024 }],
    ['claude-2.0', { inputPer1k: 0.008, outputPer1k: 0.024 }],

    // Default fallback
    ['default', { inputPer1k: 0.01, outputPer1k: 0.03 }]
  ]);

  calculate(params: {
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): number {
    const pricing = this.getPricing(params.model);

    const inputCost = (params.promptTokens / 1000) * pricing.inputPer1k;
    const outputCost = (params.completionTokens / 1000) * pricing.outputPer1k;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  estimateCost(params: {
    model: string;
    estimatedTokens: number;
    isInput: boolean;
  }): number {
    const pricing = this.getPricing(params.model);

    const costPer1k = params.isInput ? pricing.inputPer1k : pricing.outputPer1k;
    const cost = (params.estimatedTokens / 1000) * costPer1k;

    return parseFloat(cost.toFixed(6));
  }

  private getPricing(model: string): ModelPricing {
    // Try exact match
    if (this.pricingTable.has(model)) {
      return this.pricingTable.get(model)!;
    }

    // Try partial match
    for (const [key, pricing] of this.pricingTable.entries()) {
      if (model.startsWith(key)) {
        return pricing;
      }
    }

    // Return default
    console.warn(`No pricing found for model ${model}, using default`);
    return this.pricingTable.get('default')!;
  }

  setPricing(model: string, pricing: ModelPricing): void {
    this.pricingTable.set(model, pricing);
  }

  getCostBreakdown(params: {
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    const pricing = this.getPricing(params.model);

    const inputCost = parseFloat(((params.promptTokens / 1000) * pricing.inputPer1k).toFixed(6));
    const outputCost = parseFloat(((params.completionTokens / 1000) * pricing.outputPer1k).toFixed(6));

    return {
      inputCost,
      outputCost,
      totalCost: parseFloat((inputCost + outputCost).toFixed(6))
    };
  }
}
