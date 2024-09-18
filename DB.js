/**
 * Not Support List
 *  * alias
 *  * sub query
 *  * () process
 */

exports.DB = /** @class */ (function () { // class DB
    let { SQLiteDatabase } = android.database.sqlite;
    
    /**
     * class DB
     * @param {string} path - DB file path
     */

    function DB(path) {
        Object.defineProperty(this, 'path', {
            value: path,
            writable: false
        });
        this.db = SQLiteDatabase.openDatabase(path, null, 0);
        this.cursor;
    };
    DB.prototype.toString = function () {
        return "[class DB]";
    };
    /**
     * 데이터베이스 닫기
     * @returns {void|Error}
     */
    DB.prototype.close = function () {
        try {
            if (this.db) this.db.close();
            if (this.cursor) this.cursor.close();
            this.db = this.cursor = void 0;
        } catch (err) {
            return err;
        }
    };
    /**
     * 데이터베이스 다시 열기
     */
    DB.prototype.open = function () {
        if (!this.db) this.db = SQLiteDatabase.openDatabase(this.path, null, 0);
    }
    /**
     * 데이터베이스 값 불러오기
     * @param {string} type
     * @param {object} config 
     * @returns {array|object}
     */
    DB.prototype.load = function (type, config) {
        switch (type) {
            case 'table': {
                this.cursor = this.db.rawQuery("SELECT name FROM sqlite_master WHERE type='table'", []);
                let res = [];
                while (this.cursor.moveToNext()) {
                    res.push(this.cursor.getString(0));
                }
                this.cursor = this.cursor.close(), void 0;
                return res;
            }
            case 'row': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                this.cursor = this.db.rawQuery("SELECT * FROM " + table_name + " LIMIT 1", []);
                let res = this.cursor.getColumnNames();
                this.cursor = this.cursor.close(), void 0;
                return res;
            }
            case 'column': {
                config = config || {};
                let start = config.start = config.start || 0;
                let end = config.end = config.end || 1000;
                let table = config.table = config.table || void 0;
                if (table == void 0 || !table) throw new TypeError('Unknown Table Name: \'' + table + '\'');
                let where;
                if(config.where && Array.isArray(config.where)) where = this.build('where', config.where);
                this.cursor = this.db.rawQuery("SELECT * FROM " + table + (where ? ' WHERE' + where[0] : '') + " LIMIT " + (end - start) + " OFFSET " + start, (where ? where[1] : []));
                let res = [];
                while (this.cursor.moveToNext()) {
                    for (let key of this.cursor.getColumnNames()) {
                        let idx = this.cursor.getColumnIndex(key);
                        let type = this.cursor.getType(idx);
                        let row = {};

                        if (!type) {
                            row[key] = null;
                        } else if (type == 1 || type == 2) {
                            row[key] = Number(this.cursor.getString(idx));
                        } else if (type == 3) {
                            row[key] = this.cursor.getString(idx);
                        } else if (type == 4) {
                            row[key] = this.cursor.getBlob(idx);
                        }
                        res.push(row);
                    }
                }
                this.cursor = this.cursor.close(), void 0;
                return res;
            }
            default: {
                throw new TypeError('invaild database load type: ' + type);
            }
        }
    }
    /**
     * 데이터베이스 생성
     * @param {string} type 
     * @param {object} config 
     */
    DB.prototype.create = function (type, config) {
        config = config || {};
        switch (type) {
            case 'table': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let fields = config.fields = config.fields || [{
                    key: '_id',
                    type: 'INTEGER',
                    isPrimaryKey: true,
                    isAutoIncrease: true,
                    isNotNull: true,
                    unique: true, // If Primary Key, unique is always true
                    default: 1
                }];
                this.db.execSQL("create table if not exists " + table_name + " (" + this.build('fields', fields) + ")");
                break;
            }
            case 'row': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let row = config.row = config.row || {};
                if (Object.keys(row).length == 0 || !(row instanceof Object)) throw new ReferenceError('invaild row value: ' + JSON.stringify(config.row));
                let SQL = this.build('statement', {
                    table_name: table_name,
                    row: row
                });
                let statement = db.compileStatement(SQL);
                Object.keys(config.row).forEach((key, int) => {
                    let value = config.row[key];
                    if (typeof value == 'number') {
                        if (value % 1 == 0) statement.bindLong(int + 1, value);
                        else statement.bindDouble(int + 1, value);
                    } else if (typeof value === 'object' && (value.getClass ? value.getClass().getName() === '[B' : false)) {
                        statement.bindBlob(int + 1, value);
                    } else if (typeof value === 'object' && (Array.isArray(value) || value instanceof Object) && value) {
                        statement.bindString(int + 1, JSON.stringify(value));
                    } else statement.bindString(int + 1, String(value));
                });
                statement.execute();
                break;
            }
            case 'field': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let field = config.fields = config.fields || {
                    key: "_id",
                    type: "INTEGER"
                }; // It's too frustrated..
                let column = this.build('fields', [field]);
                this.db.execSQL("ALTER TABLE " + table_name + " ADD COLUMN " + column);
                break;
            }
            default: {
                throw new TypeError('invaild database create type: ' + type);
            }
        }
    }
    /**
     * 데이터베이스 수정
     * @param {string} type 
     * @param {object} config 
     */
    DB.prototype.edit = function (type, config) {
        switch (type) {
            case 'table': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let table_to = config.name = config.name || void 0;
                if (!table_to) throw new TypeError('invaild change table name: ' + table_to);
                this.db.execSQL("ALTER TABLE " + table_name + " RENAME TO " + table_to);
                break;
            }
            case 'field': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let field = config.field = config.field || void 0;
                if (!field) throw new TypeError('invaild field name: ' + field);
                let field_to = config.new_field = config.new_field || field;
                if (field_to == field) break;
                this.db.execSQL("ALTER TABLE " + table_name + " RENAME COLUMN " + field + " TO " + field_to);
                break;
            }
            case 'row': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let values = config.values = config.values || [];
                if (values.length < 1) throw new ReferenceError("invaild values reference");
                let where = cofig.where = config.where || [];
                if (where.length < 1) throw new ReferenceError("invaild where reference");
                let condition = this.build('where', where);
                let contentValues = new android.content.ContentValues();
                values.forEach(data => {
                    let keys = Object.keys(data);
                    for (let key of keys) {
                        let value = data[key];
                        contentValues.put(key, value);
                    };
                });
                this.db.update(table_name, contentValues, condition[0], condition[1]);
                break;
            }
            default: {
                throw new TypeError('invaild database edit type: ' + type);
            }
        }
    }
    /**
     * 데이터베이스 삭제
     * @param {string} type 
     * @param {object} config 
     */
    DB.prototype.delete = function (type, config) {
        switch (type) {
            case 'table': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                this.db.execSQL("DROP TABLE IF EXISTS " + table_name);
                break;
            }
            case 'field': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let field = config.field = config.field || void 0;
                if (!field) throw new TypeError('invaild field name: ' + field);
                this.db.execSQL("ALTER TABLE " + table_name + " DROP COLUMN " + field);
                break;
            }
            case 'row': {
                let table_name = config.table = config.table || void 0;
                if (!table_name) throw new TypeError('invaild table name: ' + table_name);
                let where = cofig.where = config.where || [];
                if (where.length < 1) throw new ReferenceError("invaild where reference");
                let condition = this.build('where', where);
                this.db.delete(table_name, condition[0], condition[1]);
                break;
            }
            default: {
                throw new TypeError('invaild database delete type: ' + type);
            }
        }
    }
    DB.prototype.build = function (type, datas) {
        switch (type) {
            case 'fields': {
                let res = [];
                datas.forEach(data => {
                    let str = [data.key, data.type.toUpperCase()];
                    if (data.isPrimaryKey) str.push("PRIMARY KEY");
                    if (data.isAutoIncrease) str.push("AUTOINCREMENT");
                    if (data.isNotNull) str.push("NOT NULL");
                    if (data.unique && !data.isPrimaryKey) str.push("UNIQUE");
                    if (data.default != void 0) {
                        if (data.isPrimaryKey) {
                            str.push("DEFAULT " + JSON.stringify(data.default.toString()));
                        } else {
                            str.push("DEFAULT " + JSON.stringify(data.default));
                        }
                    }
                    res.push(str.join(" "));
                });
                return res.join(", ");
            }
            case 'statement': {
                return 'INSERT INTO ' + datas.table_name + ' (' + Object.keys(datas.row).join(", ") + ') VALUES (' + Object.keys(datas.row).map(_ => '?').join(', ') + ')';
            }
            case 'where': {
                /**
                 * config [
                 *     {
                 *         key: string,
                 *         value: any,
                 *         bridge: 'AND', // default, ex) OR
                 *         condition: 'equal'
                 *         'equal'- WHERE: =  (default)
                 *         'up'   - WHERE: value < key
                 *         'down' - WHERE: value > key
                 *         'ute'  - WHERE: value <= key
                 *         'dte'  - WHERE: value >= key
                 *     }
                 * ]
                */
                let res = [];
                let inject = [];
                config.forEach((data, int) => {
                    let str = [];
                    if (int > 0) str.push((data.bridge || 'and').toUpperCase());
                    str.push('?');
                    inject.push(data.value);
                    switch (data.condition.toLowerCase()) {
                        case 'gt':
                        case 'up': {
                            str.push('<');
                            break;
                        }
                        case 'lt':
                        case 'down': {
                            str.push('>');
                            break;
                        }
                        case 'gte':
                        case 'ute': {
                            str.push('<=');
                            break;
                        }
                        case 'lte':
                        case 'dte': {
                            str.push('>=');
                            break;
                        }
                        case 'eq':
                        case 'equal':
                        default: {
                            str.push('=');
                            break;
                        }
                    };
                    str.push(data.key);
                    res.push(str.join(' '));
                });
                return [res.join(' '), inject];
            }
            default: {
                throw new TypeError('invaild database build type: ' + type);
            }
        }
    }

    return DB;
})();
