const fs = require("fs");
const path = require("path");

class FileManagerError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "FileManagerError";
    }
}

module.exports = class FileManager {
    constructor(p) {
        const ap = path.resolve(p);
        if (path.parse(ap).ext != "") {
            throw new FileManagerError("The constructor can only receive the path to a folder.");
        }
        this._newdir(ap);
        this.root = ap;
    }

    /**
     * @param {string|undefined} p Path of dir. (optional)
     * @description Whether the path is beyond the root.
     */
    isLegal(p) {
        const ap = this.toAP(p);
        return !(path.relative(this.root, ap).length == 0 || path.relative(this.root, ap).indexOf("..") == 0);
    }

    /**
     * @param {string|undefined} p Path of dir. (optional)
     * @description Whether the file exists.
     */
    async isExist(p) {
        return await this._access(this.toAP(p), fs.constants.F_OK);
    }

    /**
     * @param {string|undefined} p Path of dir. (optional)
     * @description Convert to an absolute path based on the root.
     */
    toAP(p) {
        return path.resolve(this.root, p);
    }

    /**
     * @param {string|undefined} p Path of dir. (optional)
     * @description Browse from the root when p is undefined.
     */
    async browse(p) {
        let view = null;
        if (p == undefined) {
            view = await this._scandir(this.root);
        } else {
            const ap = this._pretreat(p);
            const { ext } = path.parse(ap);
            if (ext == "") {
                if (await this._access(ap, fs.constants.F_OK)) {
                    view = await this._scandir(ap);
                } else {
                    throw new FileManagerError("Target doesn't exist.");
                }
            } else {
                throw new FileManagerError("Target must be a folder.");
            }
        }
        return view;
    }

    /**
     * @param {array} list An array of objects. Each object has p and rstream prop to appoint path and source.
     * @param {boolean} cover Whether to overwrite the target with the same name.
     */
    async create(list, cover = false) {
        for (const item of list) {
            const ap = this._pretreat(item.p);
            const { ext } = path.parse(ap);
            if (ext == "") {
                await this._newdir(ap);
            } else {
                await this._newfile(ap, item.rstream, cover);
            }
        }
        return { res: "ok" };
    }

    /**
     * @param {array} list An array of objects. Each object has sp and dp prop to appoint srcpath and destpath.
     * @param {boolean} cover Whether to overwrite the target with the same name.
     */
    async copy(list, cover = true) {
        for (const item of list) {
            const asp = this._pretreat(item.sp);
            const adp = this._pretreat(item.dp);
            const spext = path.parse(asp).ext;
            const dpext = path.parse(adp).ext;
            if (spext == dpext && spext == "") {
                await this._copydir(asp, adp, cover);
            } else if (spext == dpext && spext != "") {
                await this._copyfile(asp, adp, cover);
            } else {
                throw new FileManagerError("Source and target types do not match.");
            }
        }
        return { res: "ok" };
    }

    /**
     * @param {array} list An array of objects. Each object has sp and dp prop to appoint srcpath and destpath.
     * @param {boolean} cover Whether to overwrite the target with the same name.
     */
    async cut(list, cover = true) {
        for (const item of list) {
            const asp = this._pretreat(item.sp);
            const adp = this._pretreat(item.dp);
            const spext = path.parse(asp).ext;
            const dpext = path.parse(adp).ext;
            if (spext == dpext && spext == "") {
                await this._copydir(asp, adp, cover);
                await this._removedir(asp);
            } else if (spext == dpext && spext != "") {
                await this._copyfile(asp, adp, cover);
                await this._removefile(asp);
            } else {
                throw new FileManagerError("Source and target types do not match.");
            }
        }
        return { res: "ok" };
    }

    /**
     * @param {array} list An array of objects. Each object has op and np prop to appoint oldpath and newpath.
     */
    async rename(list) {
        for (const item of list) {
            const aop = this._pretreat(item.op);
            const anp = this._pretreat(item.np);
            if (path.relative(path.dirname(aop), path.dirname(anp)) != "") {
                throw new FileManagerError("Directory mismatch.");
            }
            await this._rename(aop, anp);
        }
        return { res: "ok" };
    }

    /**
     * @param {array} list Path array.
     */
    async remove(list) {
        for (const p of list) {
            const ap = this._pretreat(p);
            const { ext } = path.parse(ap);
            if (ext == "") {
                await this._removedir(ap);
            } else {
                await this._removefile(ap);
            }
        }
        return { res: "ok" };
    }

    /**
     * @desciption Clear all items in the folder bound to the current instance.
     */
    async clear() {
        for await (const dirent of await fs.promises.opendir(this.root)) {
            if (dirent.isDirectory()) {
                await this._removedir(path.resolve(this.root, dirent.name));
            } else if (dirent.isFile()) {
                await this._removefile(path.resolve(this.root, dirent.name));
            } else {
                throw new FileManagerError("Unrecognized target.");
            }
        }
        return { res: "ok" };
    }

    /**
     * @param {array} tasks An array of objects. Each object represent a task which use nm prop to appoint operation.
     */
    async bulk(tasks) {
        for (const task of tasks) {
            switch (task.nm) {
                case "create":
                    await this.create(task.ls, task.cvr == undefined ? true : task.cvr);
                    break;
                case "copy":
                    await this.copy(task.ls, task.cvr == undefined ? true : task.cvr);
                    break;
                case "cut":
                    await this.cut(task.ls, task.cvr == undefined ? true : task.cvr);
                    break;
                case "rename":
                    await this.rename(task.ls);
                    break;
                case "remove":
                    await this.remove(task.ls);
                    break;
                case "clear":
                    await this.clear();
                    break;
                default:
                    throw new FileManagerError("Unknown operation.");
            }
        }
        return { res: "ok" };
    }

    _pretreat(p) {
        const ap = this.toAP(p);
        if (!this.isLegal(ap)) throw new FileManagerError("Illegal path.");
        return ap;
    }

    _scandir(ap) {
        const res = [];
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    for await (const dirent of await fs.promises.opendir(ap)) {
                        const curp = path.relative(this.root, path.resolve(ap, dirent.name));
                        if (dirent.isDirectory()) {
                            res.push({
                                name: dirent.name,
                                path: curp,
                                isdir: true,
                                children: await this._scandir(path.resolve(ap, dirent.name)),
                            });
                        } else if (dirent.isFile()) {
                            res.push({
                                name: dirent.name,
                                path: curp,
                                size: (await this._stat(curp)).size,
                                isdir: false,
                            });
                        } else {
                            throw new FileManagerError("Unrecognized target.");
                        }
                    }
                    resolve(res);
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    _newfile(ap, rstream, cover) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    await this._newdir(path.dirname(ap));
                    if (
                        !(await this._access(ap, fs.constants.F_OK)) ||
                        ((await this._access(ap, fs.constants.F_OK)) && cover)
                    ) {
                        const wstream = fs.createWriteStream(ap);
                        rstream.pipe(wstream);
                        resolve(true);
                    } else {
                        throw new FileManagerError("Target already exists.");
                    }
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    _newdir(ap) {
        return new Promise((resolve, reject) => {
            fs.mkdir(ap, { recursive: true }, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    _copyfile(asp, adp, cover) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    await this._newdir(path.dirname(adp));
                    if (
                        !(await this._access(adp, fs.constants.F_OK)) ||
                        ((await this._access(adp, fs.constants.F_OK)) && cover)
                    ) {
                        fs.createReadStream(asp).pipe(fs.createWriteStream(adp));
                    } else {
                        throw new FileManagerError("Target already exists.");
                    }
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    _copydir(asp, adp, cover) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    await this._newdir(adp);
                    for await (const dirent of await fs.promises.opendir(asp)) {
                        if (dirent.isDirectory()) {
                            await this._copydir(path.resolve(asp, dirent.name), path.resolve(adp, dirent.name), cover);
                        } else if (dirent.isFile()) {
                            await this._copyfile(path.resolve(asp, dirent.name), path.resolve(adp, dirent.name), cover);
                        } else {
                            throw new FileManagerError("Unrecognized target.");
                        }
                    }
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    _rename(aop, anp) {
        return new Promise((resolve, reject) => {
            fs.rename(aop, anp, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    _removefile(ap) {
        return new Promise((resolve, reject) => {
            fs.unlink(ap, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    _removedir(ap) {
        return new Promise((resolve, reject) => {
            fs.rmdir(ap, { recursive: true }, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    _access(ap, mode) {
        return new Promise(resolve => {
            fs.access(ap, mode, err => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    _stat(ap) {
        return new Promise((resolve, reject) => {
            fs.stat(ap, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }
};
