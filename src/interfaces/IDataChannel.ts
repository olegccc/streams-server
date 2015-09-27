///<reference path='IDataChannelUpdates.ts'/>
///<reference path='IRecord.ts'/>

interface IDataChannel {
    getIds: (filter: any, callback: (error: Error, ids?: string[]) => void) => void;
    read: (id: string, callback: (error: Error, record?: IRecord) => void) => void;
    update: (record: IRecord, callback: (error: Error, record?: IRecord) => void) => void;
    create: (record: IRecord, callback: (error: Error, record: IRecord) => void) => void;
    remove: (id: string, callback: (error: Error) => void) => void;
    getVersion: (callback: (error: Error, version?: string) => void) => void;
    getUpdates: (from: string, filter: any, callback: (error: Error, updates?: IUpdate[]) => void) => void;
}
