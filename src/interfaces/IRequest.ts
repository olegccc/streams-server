interface IRequest {
    command: string;
    id: string;
    record: IRecord;
    echo: boolean;
    version: string;
    nodeId?: string;
    rights: { [key: string]: boolean};
    access: { [key: string]: boolean};
}
