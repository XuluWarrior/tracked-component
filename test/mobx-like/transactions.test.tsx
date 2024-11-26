import * as React from "react"
import { act, render } from "@testing-library/react"

import {Box} from './utils'
import {trackedComponent} from "../../src";

test("mobx issue 50", done => {
    const foo = {
        a: new Box(true),
        b: new Box(false),
        c: (): boolean => {
            // console.log("evaluate c")
            return foo.b.get()
        })
    }
    function flipStuff() {
        mobx.transaction(() => {
            foo.a.set(!foo.a.get())
            foo.b.set(!foo.b.get())
        })
    }
    let asText = ""
    let willReactCount = 0
    mobx.autorun(() => (asText = [foo.a.get(), foo.b.get(), foo.c.get()].join(":")))
    const Test = trackedComponent(() => {
        willReactCount++
        return <div id="x">{[foo.a.get(), foo.b.get(), foo.c.get()].join(",")}</div>
    })

    render(<Test />)

    setImmediate(() => {
        act(() => {
            flipStuff()
        })
        expect(asText).toBe("false:true:true")
        expect(document.getElementById("x")!.innerHTML).toBe("false,true,true")
        expect(willReactCount).toBe(2)
        done()
    })
})

it("should respect transaction", async () => {
    const a = new Box(2)
    const loaded = new Box(false)
    const valuesSeen = [] as number[]

    const Component = trackedComponent(() => {
        valuesSeen.push(a.get())
        if (loaded.get()) {
            return <div>{a.get()}</div>
        }
        return <div>loading</div>
    })

    const { container } = render(<Component />)

    act(() => {
        mobx.transaction(() => {
            a.set(3)
            a.set(4)
            loaded.set(true)
        })
    })

    expect(container.textContent!.replace(/\s+/g, "")).toBe("4")
    expect(valuesSeen.sort()).toEqual([2, 4].sort())
})
