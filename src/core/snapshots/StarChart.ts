/**
 * kepler.one
 *
 * Star Chart
 *
 * Responsible for capturing and managing
 * immutable reference snapshots.
*/

export interface StarChartEntry<T> {
    id: string;
    createdAt: Date;
    values: T;
}

export interface CaptureOptions {
    label?: string;
}

/* 
* Creates an independent copy of supported application values.
* 
* Supported:
*    - Primitives
*   - Arrays
*    - Plain objects
*    - Dates
*    - Regular expressions
*    - Circular references
**/
function cloneValue<T> (
    value: T,
    seen = new WeakMap<object, unknown>()
): T {
    if(
        value === null ||
        typeof value !== "object"
    ){
        return value;
    }

    const source = value as object;
    const existing = seen.get(source);

    if(existing !== undefined){
        return existing as T;
    }

    if(value instanceof Date){
        return new Date(value.getTime()) as T;
    }

    if(value instanceof RegExp){
        return new RegExp(
            value.source,
            value.flags
        ) as T;
    }

    if(Array.isArray(value)){
        const result: unknown[] = [];

        seen.set(source, result);

        for(let index=0; index<value.length; index++){
            if(index in value){
                result[index] = cloneValue(
                    value[index],
                    seen
                );
            }
        }

        return result as T;
    }

    const prototype = Object.getPrototypeOf(value);

    if(
        prototype !== Object.prototype &&
        prototype !== null
    ){
        throw new TypeError(
            "StarChart supports only plain objects, arrays, Dates and RegExps. "+
            "Use a custom serializer for other object types."
        );
    }

    const result = Object.create(prototype);

    seen.set(source, result);

    for(const key of Reflect.ownKeys(value)){
        const descriptor = Object.getOwnPropertyDescriptor(
            value,
            key
        );

        if(!descriptor?.enumerable){
            continue;
        }

        if(
            descriptor.get ||
            descriptor.set
        ){
            throw new TypeError(
                "StarChart does not support accessor properties."
            );
        }

        Object.defineProperty(result, key, {
            ...descriptor,
            value: cloneValue(
                descriptor.value,
                seen
            )
        });
    }

    return result as T;
}

/**
 * StarChart manages independent application snapshots.
 */
export class StarChart<T>{
    private charts = new Map<string, StarChartEntry<T>>();

    private sequence = 0;

    /**
   * Capture application values.
   */
    capture(values: T, options: CaptureOptions={}): StarChartEntry<T> {
        const id = `chart-${++this.sequence}`;
        const entry: StarChartEntry<T> = {
            id,
            createdAt: new Date(),
            values: cloneValue(values)
        };

        this.charts.set(id, entry);

        return {
            ...entry,
            values: cloneValue(entry.values)
        };
    }

    /**
   * Retrieve a snapshot by ID.
   */
    get(id: string): StarChartEntry<T> | undefined {
        const entry = this.charts.get(id);

        if(!entry) {
            return undefined;
        }

        return {
            ...entry,
            values: cloneValue(entry.values),
            createdAt: new Date(entry.createdAt.getTime())
        };
    }

    /**
   * Restore a copy of the captured values.
   */
    restore(id: string): T{
        const entry = this.charts.get(id);

        if(!entry) {
            throw new Error(
                `StarChart: Snapshot "${id}" was not found.`
            );
        }

        return cloneValue(entry.values);
    }

    /**
   * Check whether a snapshot exists.
   */
    has(id: string): boolean {
        return this.charts.has(id);
    }

    /**
   * Remove a particular snapshot.
   */
    remove(id: string): boolean {
        return this.charts.delete(id);
    }


    /**
   * Remove all snapshots.
   */
    clear(): void {
        this.charts.clear();
    }

    /**
   * List all available snapshots.
   */
    list(): StarChartEntry<T>[] {
        return Array.from(
            this.charts.values(),
            entry => ({
                ...entry,
                values: cloneValue(entry.values),
                createdAt: new Date(entry.createdAt.getTime())
            })
        );
    }    
}
