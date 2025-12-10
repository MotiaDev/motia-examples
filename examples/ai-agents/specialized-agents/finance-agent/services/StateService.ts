/**
 * Interface for the state operations that can be performed
 */
export interface IStateOperations {
  get<T>(scope: string, key: string): Promise<T | null>;
  set<T>(scope: string, key: string, value: T): Promise<void>;
  delete(scope: string, key: string): Promise<void>;
  clear(scope: string): Promise<void>;
}

/**
 * Service for managing state operations in a clean, reusable way
 */
export class StateService {
  private state: IStateOperations;
  private defaultScope: string;

  /**
   * Creates a new StateService
   * @param state Motia state object from context
   * @param defaultScope Default scope to use for operations
   */
  constructor(state: IStateOperations, defaultScope: string) {
    this.state = state;
    this.defaultScope = defaultScope;
  }

  /**
   * Gets a value from state
   * @param key State key
   * @param scope Optional custom scope, defaults to traceId
   * @returns The value if found, null otherwise
   */
  public async get<T>(key: string, scope?: string): Promise<T | null> {
    return this.state.get<T>(scope || this.defaultScope, key);
  }

  /**
   * Sets a value in state
   * @param key State key
   * @param value Value to store
   * @param scope Optional custom scope, defaults to traceId
   */
  public async set<T>(key: string, value: T, scope?: string): Promise<void> {
    return this.state.set<T>(scope || this.defaultScope, key, value);
  }

  /**
   * Deletes a value from state
   * @param key State key to delete
   * @param scope Optional custom scope, defaults to traceId
   */
  public async delete(key: string, scope?: string): Promise<void> {
    return this.state.delete(scope || this.defaultScope, key);
  }

  /**
   * Clears all values for a scope
   * @param scope Optional custom scope, defaults to traceId
   */
  public async clear(scope?: string): Promise<void> {
    return this.state.clear(scope || this.defaultScope);
  }

  /**
   * Gets multiple values from state
   * @param keys Array of keys to retrieve
   * @param scope Optional custom scope, defaults to traceId
   * @returns Object with key-value pairs
   */
  public async getMany<T>(keys: string[], scope?: string): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key, scope);
      })
    );
    return results;
  }

  /**
   * Sets multiple values in state
   * @param values Object with key-value pairs to store
   * @param scope Optional custom scope, defaults to traceId
   */
  public async setMany(values: Record<string, any>, scope?: string): Promise<void> {
    await Promise.all(
      Object.entries(values).map(([key, value]) => this.set(key, value, scope))
    );
  }
} 