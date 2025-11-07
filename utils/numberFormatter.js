/**
 * Formats a number with standard prefixes (K, M, B, T) with customizable thresholds
 * @param {number} numberToFormat - The number to format
 * @param {number} [kThreshold=1000] - Threshold for using 'K' (thousand) suffix
 * @param {number} [mThreshold=1000000] - Threshold for using 'M' (million) suffix
 * @param {number} [bThreshold=1000000000] - Threshold for using 'B' (billion) suffix
 * @returns {string} Formatted number with appropriate suffix
 */
export function formatNumber(numberToFormat, kThreshold = 1000, mThreshold = 1000000, bThreshold = 1000000000) {
    const num = Number(numberToFormat);
    
    // Handle non-finite numbers (Infinity, NaN)
    if (!Number.isFinite(num)) {
        return num.toString();
    }
    
    // Handle negative numbers
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    // Define trillion threshold (1000B)
    const tThreshold = bThreshold * 1000;
    
    // Check which threshold to use
    if (absNum >= tThreshold * 1000) {
        // For numbers >= 1000T, use scientific notation
        return sign + absNum.toExponential(2);
    } else if (absNum >= tThreshold) {
        // Trillions
        const formatted = (absNum / tThreshold).toFixed(1);
        return sign + (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'T';
    } else if (absNum >= bThreshold) {
        // Billions
        const formatted = (absNum / bThreshold).toFixed(1);
        return sign + (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'B';
    } else if (absNum >= mThreshold) {
        const formatted = (absNum / 1000000).toFixed(1);
        return sign + (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'M';
    } else if (absNum >= kThreshold) {
        const formatted = (absNum / 1000).toFixed(1);
        return sign + (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'K';
    } else if (absNum >= 1) {
        // For numbers between 1 and kThreshold, return as is without decimal
        return sign + Math.round(absNum).toString();
    } else if (absNum > 0) {
        // For numbers between 0 and 1, display as plain decimal up to 3 decimals
        const dec = absNum.toFixed(3);
        const trimmed = dec.replace(/\.0+$/,'').replace(/\.(?=0+$)/,'');
        return sign + (trimmed === '' ? '0' : trimmed);
    } else {
        // Zero
        return '0';
    }
}

// Example usage:
// console.log(formatNumber(1001));        // "1K"
// console.log(formatNumber(1500, 1000));  // "1.5K"
// console.log(formatNumber(5000000, 1000, 10000000)); // "5000000"
// console.log(formatNumber(15000000, 1000, 1000000)); // "15M"
// console.log(formatNumber(0.000123));    // "1.23e-4"

/**
 * Generates a random number within a specified range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random number in the specified range
 */
function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Tests the formatNumber function with random numbers across different ranges
 * @param {number} [count=20] - Number of test cases to generate
 * @returns {Array<{range: string, input: number, output: string}>} Array of test cases with range info, input, and formatted output
 */
export function testNumberFormatter(count = 20) {
    const testCases = [];
    
    // Define test ranges with their min, max, and label
    const testRanges = [
        { min: 0.000001, max: 0.001, label: 'Very Small' },
        { min: 0.001, max: 1, label: 'Small' },
        { min: 1, max: 1000, label: 'Below 1K' },
        { min: 1000, max: 1000000, label: 'K Range' },
        { min: 1000000, max: 1000000000, label: 'M Range' },
        { min: 1000000000, max: 1000000000000, label: 'B Range' },
        { min: 1000000000000, max: 1000000000000000, label: 'T Range' },
        { min: 1e15, max: 1e30, label: 'Very Large' },
        { min: -1000000, max: 0, label: 'Negative' }
    ];
    
    // Calculate how many numbers to generate per range
    const perRange = Math.max(1, Math.floor(count / testRanges.length));
    const extra = count % testRanges.length;
    
    // Generate random numbers for each range
    testRanges.forEach((range, index) => {
        // Distribute any remaining test cases
        const numInRange = index < extra ? perRange + 1 : perRange;
        
        for (let i = 0; i < numInRange && testCases.length < count; i++) {
            // For very large ranges, use exponential distribution to get better coverage
            let value;
            if (range.label === 'Very Large') {
                const exp = getRandomInRange(
                    Math.log10(range.min),
                    Math.log10(range.max)
                );
                value = Math.pow(10, exp);
            } else {
                value = getRandomInRange(range.min, range.max);
                // For non-integer ranges, keep some decimal places
                if (range.min < 1) {
                    value = parseFloat(value.toFixed(6));
                } else {
                    value = Math.floor(value);
                }
            }
            
            // Randomly make some numbers negative (except for very small positive numbers)
            if (range.min > 0 && Math.random() > 0.7) {
                value = -value;
            }
            
            testCases.push({
                range: range.label,
                value: value
            });
        }
    });
    
    // Shuffle the test cases for better variety
    testCases.sort(() => Math.random() - 0.5);
    
    // Format and return test cases
    return testCases.map(test => ({
        range: test.range,
        input: test.value,
        output: formatNumber(test.value)
    }));
}
