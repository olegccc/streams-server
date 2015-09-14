interface IDataChannel {
    getIds: () => string[];
    getRecord: (id: string) => IRecord;
}
