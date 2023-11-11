import {Database, open} from "sqlite";
import sqlite3 from "sqlite3";

export class DB {
    static async getConnection() {
        let db = await open({
            filename: "../../db/db.sqlite",
            driver: sqlite3.Database
        });
        await db.exec("PRAGMA foreign_keys = ON;");
        return db;
    }

    public static async beginTransaction(connection: Database): Promise<void> {
        await connection.run('begin transaction;');
    }

    public static async commitTransaction(connection: Database): Promise<void> {
        await connection.run('commit;');
    }

    public static async rollbackTransaction(connection: Database): Promise<void> {
        await connection.run('rollback;');
    }

}