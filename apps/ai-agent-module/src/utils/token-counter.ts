import { Injectable } from '@nestjs/common';
import { encoding_for_model, TiktokenModel } from 'tiktoken';

@Injectable()
export class TokenCounter {
  private encoders: Map<string, any> = new Map();

  count(text: string, model: string = 'gpt-4'): number {
    try {
      const encoder = this.getEncoder(model);
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback: rough estimation (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  countMessages(messages: Array<{ role: string; content: string }>, model: string = 'gpt-4'): number {
    try {
      let totalTokens = 0;

      for (const message of messages) {
        // Add tokens for message formatting
        totalTokens += 4; // Every message follows <im_start>{role/name}\n{content}<im_end>\n

        totalTokens += this.count(message.role, model);
        totalTokens += this.count(message.content, model);
      }

      totalTokens += 2; // Every reply is primed with <im_start>assistant

      return totalTokens;
    } catch (error) {
      // Fallback estimation
      const totalText = messages.map(m => m.role + m.content).join('');
      return Math.ceil(totalText.length / 4) + messages.length * 4 + 2;
    }
  }

  private getEncoder(model: string): any {
    if (this.encoders.has(model)) {
      return this.encoders.get(model);
    }

    try {
      // Map model names to tiktoken models
      let tiktokenModel: TiktokenModel = 'gpt-4';

      if (model.startsWith('gpt-4')) {
        tiktokenModel = 'gpt-4';
      } else if (model.startsWith('gpt-3.5')) {
        tiktokenModel = 'gpt-3.5-turbo';
      }

      const encoder = encoding_for_model(tiktokenModel);
      this.encoders.set(model, encoder);
      return encoder;
    } catch (error) {
      console.error(`Error loading encoder for model ${model}:`, error);
      throw error;
    }
  }

  cleanup(): void {
    // Free encoders when done
    for (const encoder of this.encoders.values()) {
      encoder.free();
    }
    this.encoders.clear();
  }
}
