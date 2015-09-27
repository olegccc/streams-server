///<reference path='IRecord.ts'/>
///<reference path='IUpdate.ts'/>

interface IResponse {
    ids: string[];
    record: IRecord;
    error: string;
    version: string;
    changes: IUpdate[];
}
