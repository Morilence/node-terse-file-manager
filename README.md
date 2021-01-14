# Terse File Manager

## Install

```shell
npm i node-terse-file-manager
```

## Use

```js
const FileManager = require("node-terse-file-manager");

// select a folder as the root directory for management
const fm = new FileManager(path.resolve(__dirname, "demo"));
```

## Methods

### create

```js
fm.create(
    [
        { p: "./temp" },
        { p: "./temp/a" },
        { p: "./temp/b" },
        { p: "./temp/c" },
        { p: "./temp/a/aa" },
        { p: "./temp/a/ab" },
        { p: "./temp/a/ac" },
        { p: "./temp/a/aa/hello.txt", buf: Buffer.from("Hello, world!") },
    ],
    true
).then(res => {
    console.log(res);
});
```

### remove

```js
fm.remove(["./temp"]).then(res => {
    console.log(res);
});
```

### copy

```js
fm.copy([{ sp: "./temp", dp: "./temp2" }], true).then(res => {
    console.log(res);
});
```

### cut

```js
fm.cut([{ sp: "./temp2", dp: "./temp3" }], true).then(res => {
    console.log(res);
});
```

### rename

```js
fm.rename([{ op: "./temp", np: "./tmp" }]).then(res => {
    console.log(res);
});
```

### bulk

```js
fm.bulk([
    {
        nm: "create",
        ls: [
            { p: "./tmp/d" },
            { p: "./tmp/d/da" },
            { p: "./tmp/d/db" },
            { p: "./tmp/d/dc" },
            { p: "./tmp/d/db/index.html", buf: Buffer.from("") },
        ],
        cvr: true, // default
    },
    {
        nm: "cut",
        ls: [{ sp: "./tmp/d/db/index.html", dp: "./tmp/d/da/index.html" }],
    },
    {
        nm: "copy",
        ls: [
            { sp: "./tmp/d/da/index.html", dp: "./tmp/d/da/index2.html" },
            { sp: "./tmp/d/da/index.html", dp: "./tmp/d/da/index3.html" },
        ],
    },
    {
        nm: "rename",
        ls: [
            { op: "./tmp/d/da/index2.html", np: "./tmp/d/da/index.css" },
            { op: "./tmp/d/da/index3.html", np: "./tmp/d/da/index.js" },
        ],
    },
]).then(res => {
    console.log(res);
});
```

### browse (for directory)

```js
function print(list, prefix = "") {
    for (const item of list) {
        process.stdout.write(prefix);
        if (!item.isdir) {
            console.log(item.name);
        } else {
            console.log(item.name + "/");
            dfsprint(item.children, prefix + "-");
        }
    }
}
print(await fm.browse());
```

### clear

```js
fm.clear();
```

## Serial execution

```js
// a simple example
(async () => {
    // create
    await fm
        .create(
            [
                { p: "./temp" },
                { p: "./temp/a" },
                { p: "./temp/b" },
                { p: "./temp/c" },
                { p: "./temp/a/aa" },
                { p: "./temp/a/ab" },
                { p: "./temp/a/ac" },
                { p: "./temp/a/aa/hello.txt", buf: Buffer.from("Hello, world!") },
            ],
            true
        )
        .then(res => {
            console.log("create:", res);
        });

    // copy
    await fm.copy([{ sp: "./temp", dp: "./temp3" }], true).then(res => {
        console.log("copy:", res);
    });

    // cut
    await fm.cut([{ sp: "./temp3", dp: "./temp2" }], true).then(res => {
        console.log("cut:", res);
    });

    // remove
    await fm.remove(["./temp"]).then(res => {
        console.log("remove:", res);
    });

    // rename
    await fm.rename([{ op: "./temp2", np: "./tmp" }]).then(res => {
        console.log("rename:", res);
    });

    // bulk
    await fm
        .bulk([
            {
                nm: "create",
                ls: [
                    { p: "./tmp/d" },
                    { p: "./tmp/d/da" },
                    { p: "./tmp/d/db" },
                    { p: "./tmp/d/dc" },
                    { p: "./tmp/d/db/index.html", buf: Buffer.from("") },
                ],
                cvr: true, // default
            },
            {
                nm: "cut",
                ls: [{ sp: "./tmp/d/db/index.html", dp: "./tmp/d/da/index.html" }],
            },
            {
                nm: "copy",
                ls: [
                    { sp: "./tmp/d/da/index.html", dp: "./tmp/d/da/index2.html" },
                    { sp: "./tmp/d/da/index.html", dp: "./tmp/d/da/index3.html" },
                ],
            },
            {
                nm: "rename",
                ls: [
                    { op: "./tmp/d/da/index2.html", np: "./tmp/d/da/index.css" },
                    { op: "./tmp/d/da/index3.html", np: "./tmp/d/da/index.js" },
                ],
            },
        ])
        .then(res => {
            console.log("bulk:", res);
        });

    // browse
    function print(list, prefix = "") {
        for (const item of list) {
            process.stdout.write(prefix);
            if (!item.isdir) {
                console.log(item.name);
            } else {
                console.log(item.name + "/");
                print(item.children, prefix + "-");
            }
        }
    }
    print(await fm.browse());

    // clear
    await fm.clear();
})();
```
