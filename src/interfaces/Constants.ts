export class Constants {
    static COMMAND_IDS: string = "ids";
    static COMMAND_CREATE: string = "create";
    static COMMAND_READ: string = "read";
    static COMMAND_UPDATE: string = "update";
    static COMMAND_DELETE: string = "delete";
    static COMMAND_VERSION: string = "version";
    static COMMAND_CHANGES: string = "changes";

    static UPDATE_DELETED: number = 1;
    static UPDATE_CREATED: number = 2;
    static UPDATE_CHANGED: number = 3;

    static RANDOM_SEED_LENGTH = 128;

    static DATA_CHANNEL_NODES: string = '_nodes';
    static DATA_CHANNEL_NODE_ACCESS: string = '_node_access';
    static DATA_CHANNEL_OBJECTS: string = '_objects';
    static DATA_CHANNEL_LISTS: string = '_lists';

    static DEFAULT_CACHE_UPDATE_INTERVAL: number = 2000;
}
