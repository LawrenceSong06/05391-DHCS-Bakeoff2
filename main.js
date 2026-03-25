let versions = document.getElementById("versions");
VERSIONS.map((v) => {
    let a = document.createElement("a");
    a.href = `./${v}`;
    a.innerText = `${v}`;
    versions.appendChild(a);

    return v;
})