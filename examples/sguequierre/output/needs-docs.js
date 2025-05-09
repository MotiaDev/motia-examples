function sortByProperty(array, property) {
/**
   * Sorts an array of objects by a specific property.
   * 
   * This function creates a new array from the input array and sorts the new array.
   * The sorting is based on the property value of each object in the array.
   * If the property value of the first object is less than the second object, it will return -1.
   * If the property value of the first object is greater than the second object, it will return 1.
   * If the property values are equal, it will return 0.
   * 
   * @param {Object[]} array - The array of objects to be sorted.
   * @param {string} property - The property of the objects by which the array will be sorted.
   * @returns {Object[]} The sorted array.
   */
    return [...array].sort((a, b) => {
      if (a[property] < b[property]) return -1;
      if (a[property] > b[property]) return 1;
      return 0;
    });
  }
  
  function filterByValue(array, key, value) {
/**
   * Filters an array of objects based on a specified key-value pair.
   *
   * @param {Object[]} array - The array of objects to be filtered.
   * @param {string} key - The key of the key-value pair to filter by.
   * @param {string|number} value - The value of the key-value pair to filter by.
   * @returns {Object[]} The filtered array of objects.
   */
    return array.filter(item => item[key] === value);
  }
  
  function groupByProperty(array, property) {
```js
/**
 * Groups an array of objects by a specific property.
 *
 * @function groupByProperty
 * @param {Array} array - The array to be grouped.
 * @param {string} property - The property on which to group the array.
 * @returns {Object} An object where each key is a unique value from the specified property and the value is an array of objects that have that value for the specified property.
 * @example
 * // returns { '1': [{ id: 1, name: 'John' }], '2': [{ id: 2, name: 'Jane' }] }
 * groupByProperty([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }], 'id');
 */
```
    return array.reduce((grouped, item) => {
      const key = item[property];
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
      return grouped;
    }, {});
  }
  
  module.exports = {
    sortByProperty,
    filterByValue,
    groupByProperty
  };