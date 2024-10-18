export const DEBUG = true // TODO: Okay for now

export function assert(desc: string, test: unknown): asserts test {
    if (!test) {
        throw new Error(`Assertion Failed: ${desc}`);
    }
}