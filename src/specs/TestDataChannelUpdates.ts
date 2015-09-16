///<reference path='../interfaces/IDataChannelUpdates.ts'/>
///<reference path='../interfaces/IUpdate.ts'/>

export class TestDataChannelUpdates implements IDataChannelUpdates {

    private updates: IUpdate[];

    constructor() {
        this.updates = [];
    }

    getUpdates(): IUpdate[] {
        return this.updates;
    }

    onUpdate(update: IUpdate): void {
        this.updates.push(update);
    }
}
