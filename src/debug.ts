export function assert(desc: string, test: unknown): asserts test {
    if (!test) {
        throw new Error(`Assertion Failed: ${desc}`);
    }
}