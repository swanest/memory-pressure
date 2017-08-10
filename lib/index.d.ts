declare const m: pressure.MemoryPressure;
export = m;

declare namespace pressure {

    type OwnEvents = 'underPressure' | 'pressureReleased';

    interface MemoryPressure {
        "new"(name: string, options?: pressure.Options): pressure.Instance;
        EVENTS: pressure.EVENTS;
    }

    interface Instance {
        on(event: pressure.OwnEvents, cb: (...args: any[]) => void): void;
        clear(): void;
        config: pressure.Options;
        isBlocked(): boolean;
    }

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