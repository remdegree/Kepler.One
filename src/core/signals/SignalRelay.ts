import type { DriftAnalysisResult } from "../observation/DriftAnalyzer";

export interface SignalEventMap {
  drift: DriftAnalysisResult;
  attention: DriftAnalysisResult;
  clear: DriftAnalysisResult;
  launch: undefined;
  suspend: undefined;
}

export type SignalEvent = keyof SignalEventMap;

type SignalListener<K extends SignalEvent> = (
  payload: SignalEventMap[K]
) => void;

interface ListenerRegistration {
  callback: Function;
  invoke: (payload: unknown) => void;
  once: boolean;
}

export class SignalRelay {
  private listeners = new Map<
    SignalEvent,
    Set<ListenerRegistration>
  >();

  private getListeners(event: SignalEvent): Set<ListenerRegistration> {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set<ListenerRegistration>();
      this.listeners.set(event, listeners);
    }

    return listeners;
  }

  on<K extends SignalEvent>(
    event: K,
    callback: SignalListener<K>
  ): () => void {
    return this.subscribe(event, callback, false);
  }

  once<K extends SignalEvent>(
    event: K,
    callback: SignalListener<K>
  ): () => void {
    return this.subscribe(event, callback, true);
  }

  private subscribe<K extends SignalEvent>(
    event: K,
    callback: SignalListener<K>,
    once: boolean
  ): () => void {
    const registration: ListenerRegistration = {
      callback,
      invoke: (payload) =>
        callback(payload as SignalEventMap[K]),
      once
    };

    const listeners = this.getListeners(event);
    listeners.add(registration);

    return () => {
      listeners.delete(registration);

      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  off<K extends SignalEvent>(
    event: K,
    callback: SignalListener<K>
  ): void {
    const listeners = this.listeners.get(event);

    if (!listeners) return;

    for (const registration of listeners) {
      if (registration.callback === callback) {
        listeners.delete(registration);
      }
    }

    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  clear(event?: SignalEvent): void {
    if (event) {
      this.listeners.delete(event);
      return;
    }

    this.listeners.clear();
  }

  emit<K extends SignalEvent>(
    event: K,
    payload: SignalEventMap[K]
  ): void {
    const listeners = this.listeners.get(event);

    if (!listeners) return;

    const errors: unknown[] = [];

    for (const registration of [...listeners]) {
      if (!listeners.has(registration)) continue;

      if (registration.once) {
        listeners.delete(registration);
      }

      try {
        registration.invoke(payload);
      } catch (error) {
        errors.push(error);
      }
    }

    if (listeners.size === 0) {
      this.listeners.delete(event);
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `One or more listeners failed while emitting "${event}".`
      );
    }
  }
}