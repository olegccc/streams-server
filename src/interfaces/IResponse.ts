///<reference path='IRecord.ts'/>
///<reference path='IUpdate.ts'/>

interface IResponse {
    ids: string[];
    record: IRecord;
    error: string;
    version: number;
    changes: IUpdate[];
}
