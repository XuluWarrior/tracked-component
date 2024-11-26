import mockConsole from "jest-mock-console"
import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"

import {Tracking} from "../../src"
import {Box} from './utils'

afterEach(cleanup)

describe("regions should rerender component", () => {
    const execute = () => {
        const data = new Box("hi")
        const Comp = () => (
            <div>
                <Tracking>{() => <span>{data.get()}</span>}</Tracking>
                <li>{data.get()}</li>
            </div>
        )
        return { ...render(<Comp />), data }
    }

    test("init state is correct", () => {
        const { container } = execute()
        expect(container.querySelector("span")!.innerHTML).toBe("hi")
        expect(container.querySelector("li")!.innerHTML).toBe("hi")
    })

    test("set the data to hello", async () => {
        const { container, data } = execute()
        act(() => {
            data.set("hello")
        })
        expect(container.querySelector("span")!.innerHTML).toBe("hello")
        expect(container.querySelector("li")!.innerHTML).toBe("hi")
    })
})

it("renders null if no children/render prop is supplied a function", () => {
    const restoreConsole = mockConsole()
    const Comp = () => <Tracking />
    const { container } = render(<Comp />)
    expect(container).toMatchInlineSnapshot(`<div />`)
    restoreConsole()
})

it.skip("prop types checks for children/render usage", () => {
    const Comp = () => (
        <Tracking render={() => <span>children</span>}>{() => <span>children</span>}</Tracking>
    )
    const restoreConsole = mockConsole()
    render(<Comp />)
    // tslint:disable-next-line:no-console
    expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Do not use children and render in the same time")
    )
    restoreConsole()
})
