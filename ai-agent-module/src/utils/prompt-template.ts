export class PromptTemplate {
  private sections: Array<{ title: string; content: string }> = [];
  private basePrompt: string;

  constructor(basePrompt: string) {
    this.basePrompt = basePrompt;
  }

  addSection(title: string, content: string): void {
    this.sections.push({ title, content });
  }

  render(variables: Record<string, any> = {}): string {
    let prompt = this.basePrompt;

    // Replace variables in base prompt
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, String(value));
    }

    // Add sections
    if (this.sections.length > 0) {
      const sectionsText = this.sections
        .map(section => `\n\n## ${section.title}\n\n${section.content}`)
        .join('');

      prompt += sectionsText;
    }

    return prompt;
  }

  clear(): void {
    this.sections = [];
  }
}
