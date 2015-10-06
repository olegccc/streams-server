///<reference path='IRecord.ts'/>

interface IUser extends IRecord {
    name: string;
    password: string;
    seed: string;
    title: string;
}
