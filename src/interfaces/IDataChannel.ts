///<reference path='IDataChannelUpdates.ts'/>
///<reference path='IRecord.ts'/>

interface IDataChannel {
    getIds: (filter?: any) => string[];
    read: (id: string) => IRecord;
    update: (record: IRecord) => IRecord;
    create: (record: IRecord) => void;
    remove: (id: string) => void;
    subscribe: (updates: IDataChannelUpdates, filter?: any) => string;
    unsubscribe: (id: string) => void;
    getVersion: () => number;
    getUpdates: (from: number, filter?: any) => IUpdate[];
}
