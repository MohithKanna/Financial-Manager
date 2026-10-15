type Observer<T> = (data: T) => void;

class EventEmitter<T> {
    private observers: Observer<T>[] = [];

    subscribe(observer: Observer<T>) {
        this.observers.push(observer);
    }
    unsubscribe(observer: Observer<T>) {
        this.observers = this.observers.filter((obs) => obs !== observer);
    }
    notify(data: T) {
        this.observers.forEach((obs) => obs(data));
    }
}

export default EventEmitter;
