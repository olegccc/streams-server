///<reference path='IRecord.ts'/>
///<reference path='IUpdate.ts'/>

interface IResponse {
    ids: string[];
    record: IRecord;
    version: string;
    changes: IUpdate[];
}
