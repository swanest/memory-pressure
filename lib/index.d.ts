declare namespace memoryPressure {

    function newIns(name: string, options?: Options): MemoryPressure;
    export const EVENTS: EVENTS;

    export {newIns as new};

    export interface MemoryPressure {
        on(event: OwnEvents, cb: (...args: any[]) => void): void;

        clear(): void;

        config: Options;

        isBlocked(): boolean;
    }

    type OwnEvents = 'underPressure' | 'pressureReleased';

    interface Options {
        memoryThreshold?: number;
        interval?: number;
        consecutiveGrowths?: number;
    }

    interface EVENTS {
        UNDER_PRESSURE: 'underPressure';
        PRESSURE_RELEASED: 'pressureReleased';
    }
}

export = memoryPressure;