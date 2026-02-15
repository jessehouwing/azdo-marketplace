/**
 * Fluent argument builder for constructing tfx CLI arguments
 */
export class ArgBuilder {
  private args: string[] = [];

  /**
   * Add one or more arguments
   */
  arg(values: string | string[]): this {
    if (Array.isArray(values)) {
      this.args.push(...values);
    } else {
      this.args.push(values);
    }
    return this;
  }

  /**
   * Add arguments if condition is truthy
   */
  argIf(condition: unknown, values: string | string[]): this {
    if (condition) {
      return this.arg(values);
    }
    return this;
  }

  /**
   * Add a flag (e.g., '--json')
   */
  flag(name: string): this {
    this.args.push(name);
    return this;
  }

  /**
   * Add a flag if condition is truthy
   */
  flagIf(condition: unknown, name: string): this {
    if (condition) {
      return this.flag(name);
    }
    return this;
  }

  /**
   * Add an option with value (e.g., '--publisher', 'myPublisher')
   */
  option(name: string, value: string | undefined): this {
    if (value !== undefined) {
      this.args.push(name, value);
    }
    return this;
  }

  /**
   * Add an option if condition is truthy
   */
  optionIf(condition: unknown, name: string, value: string | undefined): this {
    if (condition && value !== undefined) {
      return this.option(name, value);
    }
    return this;
  }

  /**
   * Append raw command line string (split on spaces)
   */
  line(raw: string): this {
    const parts = raw.split(/\s+/).filter((s) => s.length > 0);
    this.args.push(...parts);
    return this;
  }

  /**
   * Build and return the argument array
   */
  build(): string[] {
    return [...this.args];
  }
}
