///<reference path='../interfaces/IDataChannelUpdates.ts'/>
///<reference path='../interfaces/IUpdate.ts'/>

class TestDataChannelUpdates implements IDataChannelUpdates {

    private updates: IUpdate[];

    constructor() {
        this.updates = [];
    }

    onUpdate(update: IUpdate): void {
        this.updates.push(update);
    }
}
