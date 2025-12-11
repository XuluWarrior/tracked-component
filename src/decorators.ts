import {Consumer} from "../../tracked";

type ExcludeSymbolsAndFunctions<T> = {
    [Key in keyof T]: Key extends symbol ? never : T[Key] extends Function ? never : Key
}[keyof T]



type SubPath<T> = {
    // [K in keyof T]: `${PropPath<T[K]>}`
    [K in keyof T]: `${ExcludeSymbolsAndFunctions<T[K]>}`
}[keyof T];

type PropPath<T> = `${ExcludeSymbolsAndFunctions<T>}` | `${ExcludeSymbolsAndFunctions<T>}.${SubPath<T>}`

export function effect<T>(...pathsToTrack: PropPath<T>[]) {
    const splitPathsToTrack = pathsToTrack.map(path => path.split("."))

    return function (_method: () => unknown, context: ClassMethodDecoratorContext<T>) {
        const methodName = context.name;

        context.addInitializer(function (this: any) {

            const method = this[methodName];
            const getTrackedPathValue = (obj: any, props: string[]): any => {
                const [first, ...rest] = props;
                const valueOrChild = obj[first]
                return rest.length ? getTrackedPathValue(valueOrChild, rest) : valueOrChild
            }

            const getTrackedValues = () =>
                splitPathsToTrack.map(path => getTrackedPathValue(this, path))

            const trackingSym = Symbol(methodName.toString())
            const consumerSym = Symbol(`${methodName.toString()}-consumer`) as keyof T

            let lastTrackedValues: any[] | undefined = undefined

            const consumer = new Consumer(getTrackedValues, trackingSym)
            // consumer.getValue();  CHECK I DON"T NEED THIS
            this[consumerSym] = consumer

            const onMount = () => {
                lastTrackedValues = this[consumerSym].getValue();
                method.call(this)
            }
            const effect = () => {
                if (!lastTrackedValues) {
                    onMount()
                } else {
                    if (this[consumerSym].isDirty) {
                        const newTrackedValues: any[] = this[consumerSym].getValue();
                        if (newTrackedValues.some((newValue, i) => lastTrackedValues![i] !== newValue)) {
                            lastTrackedValues = newTrackedValues;
                            method.call(this)
                        }
                    }
                }
            }
            consumer.addListener(effect)

            this.effects.push([onMount, consumer])
        });
    }
}