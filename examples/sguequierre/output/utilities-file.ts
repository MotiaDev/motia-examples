function debounce(func: Function, delay: number): Function {
/**
   * `debounce` is a function that enforces that a function not be called again until a certain amount of time has passed without it being called. 
   * As in "execute this function only if 100 milliseconds have passed without it being called again".
   * 
   * @export
   * @param {Function} func - The function to debounce.
   * @param {number} delay - The amount of time (in milliseconds) that needs to pass without the function being called.
   * @returns {Function} - Returns a new function that when called, will delay the execution of the `func` function until the specified `delay` has passed.
   * 
   * @example
   * debounce(() => console.log('Hello'), 100);
   */
    let timeoutId: NodeJS.Timeout;
    
    return function(...args: any[]) {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
  
  export function deepClone<T>(obj: T): T {
/**
   * Creates a deep clone of a given object.
   * 
   * This function uses JSON.stringify to convert the object into a string, 
   * and then JSON.parse to parse that string back into a new object. 
   * This has the effect of creating a deep clone of the object, 
   * with all elements recursively duplicated, not just reference copied.
   *
   * @template T The type of the object to be cloned.
   * @param {T} obj The object to clone.
   * @returns {T} A deep clone of the original object.
   */
    return JSON.parse(JSON.stringify(obj));
  }
  
  export function getRandomElement<T>(array: T[]): T {
/**
   * Returns a random element from the provided array.
   * 
   * @template T The type of elements in the array.
   * @param {T[]} array The array from which to get a random element.
   * @returns {T} A random element from the provided array.
   */
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }