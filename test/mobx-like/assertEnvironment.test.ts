afterEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
})

it("throws if react is not installed", () => {
    jest.mock("react", () => ({}))
    expect(() => require("../src/utils/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"mobx-react-lite requires React with Hooks support"`
    )
})
