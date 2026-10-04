// ======================================================
// APEX RAW - app.js
// ======================================================

// ---------- SUPABASE ----------
const SUPABASE_URL = "https://gieonkfqossjaeqvmrrt.supabase.co";
const SUPABASE_KEY = "sb_publishable_6sexEJVG-ndqELCJKnThHg_4BgRnNvZ";
const BUCKET = "scripts";

// ---------- ELEMENTOS ----------
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const codeInput = document.getElementById("code");
const publishButton = document.getElementById("publish");

const rawUrlInput = document.getElementById("rawUrl");
const loadstringInput = document.getElementById("loadstring");

const copyRawButton = document.getElementById("copyRaw");
const copyLoadstringButton = document.getElementById("copyLoadstring");

const urlInput = document.getElementById("url");
const viewButton = document.getElementById("view");

const errorBox = document.getElementById("error");
const viewer = document.getElementById("viewer");
const viewerName = document.getElementById("viewerName");
const viewerInfo = document.getElementById("viewerInfo");
const viewerCode = document.getElementById("viewerCode");
const copyCodeButton = document.getElementById("copyCode");

// ======================================================
// UTILIDADES
// ======================================================

function showError(message) {
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.style.display = "block";
}

function hideError() {
    if (!errorBox) return;

    errorBox.textContent = "";
    errorBox.style.display = "none";
}

function generateID(length = 12) {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );
    }

    return result;
}

function cleanFileName(name) {
    let value = String(name || "script")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 50);

    if (!value) {
        value = "script";
    }

    return value;
}

function buildPublicURL(fileName) {
    return (
        SUPABASE_URL +
        "/storage/v1/object/public/" +
        BUCKET +
        "/" +
        encodeURIComponent(fileName)
    );
}

async function copyText(text) {
    if (!text) return false;

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // Fallback para algunos navegadores móviles
        try {
            const textarea = document.createElement("textarea");

            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            const success = document.execCommand("copy");

            textarea.remove();

            return success;
        } catch (fallbackError) {
            return false;
        }
    }
}

// ======================================================
// PUBLICAR SCRIPT
// ======================================================

async function publishScript() {
    hideError();

    const name = nameInput ? nameInput.value.trim() : "";
    const description = descriptionInput
        ? descriptionInput.value.trim()
        : "";
    const code = codeInput ? codeInput.value : "";

    if (!name) {
        showError("Escribe un nombre para el script.");
        return;
    }

    if (!code.trim()) {
        showError("Pega el código del script antes de publicarlo.");
        return;
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        showError("Falta configurar Supabase.");
        return;
    }

    // Desactivar botón durante la subida
    if (publishButton) {
        publishButton.disabled = true;
        publishButton.textContent = "Publicando...";
    }

    try {
        const id = generateID(12);

        const safeName = cleanFileName(name);

        // Ejemplo:
        // A8K29x123456_Mi_Script.lua
        const fileName = id + "_" + safeName + ".lua";

        const uploadURL =
            SUPABASE_URL +
            "/storage/v1/object/" +
            BUCKET +
            "/" +
            encodeURIComponent(fileName);

        const response = await fetch(uploadURL, {
            method: "POST",

            headers: {
                "Authorization": "Bearer " + SUPABASE_KEY,
                "apikey": SUPABASE_KEY,
                "Content-Type": "text/plain; charset=utf-8",
                "x-upsert": "false"
            },

            body: code
        });

        let responseData = null;

        try {
            responseData = await response.json();
        } catch (jsonError) {
            responseData = null;
        }

        if (!response.ok) {
            console.error("Supabase error:", responseData);

            let message = "No se pudo publicar el script.";

            if (responseData) {
                if (responseData.message) {
                    message = responseData.message;
                } else if (responseData.error) {
                    message = responseData.error;
                }
            }

            if (response.status === 401 || response.status === 403) {
                message =
                    "Supabase rechazó la subida. Revisa la policy INSERT del bucket scripts.";
            }

            throw new Error(message);
        }

        // URL pública real
        const publicURL = buildPublicURL(fileName);

        // Loadstring para Roblox
        const loadstring =
            'loadstring(game:HttpGet("' +
            publicURL +
            '"))()';

        // Mostrar resultados
        if (rawUrlInput) {
            rawUrlInput.value = publicURL;
        }

        if (loadstringInput) {
            loadstringInput.value = loadstring;
        }

        // Intentar hacer visibles los resultados
        const resultElements = document.querySelectorAll(
            ".publish-result, #publishResult, .result"
        );

        resultElements.forEach((element) => {
            element.style.display = "block";
        });

        // Mensaje visual
        if (publishButton) {
            publishButton.textContent = "Publicado";
        }

        console.log("Apex Raw publicado:");
        console.log("Nombre:", name);
        console.log("Descripción:", description);
        console.log("Raw URL:", publicURL);
        console.log("Loadstring:", loadstring);

    } catch (error) {
        console.error(error);

        showError(
            error && error.message
                ? error.message
                : "Ocurrió un error al publicar el script."
        );

        if (publishButton) {
            publishButton.textContent = "Publicar";
        }
    } finally {
        if (publishButton) {
            publishButton.disabled = false;

            if (publishButton.textContent === "Publicando...") {
                publishButton.textContent = "Publicar";
            }
        }
    }
}

// ======================================================
// CARGAR / VER CÓDIGO
// ======================================================

async function loadScriptFromURL() {
    hideError();

    const url = urlInput ? urlInput.value.trim() : "";

    if (!url) {
        showError("Pega una URL Raw.");
        return;
    }

    if (viewButton) {
        viewButton.disabled = true;
        viewButton.textContent = "Cargando...";
    }

    try {
        let targetURL = url;

        // Permitir algunas URLs comunes
        // Pastebin normal -> Raw
        if (targetURL.includes("pastebin.com/") &&
            !targetURL.includes("/raw/")) {

            const parts = targetURL.split("/");

            const pasteID = parts[parts.length - 1];

            if (pasteID) {
                targetURL =
                    "https://pastebin.com/raw/" +
                    pasteID;
            }
        }

        const response = await fetch(targetURL, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                "No se pudo acceder al código. HTTP " +
                response.status
            );
        }

        const code = await response.text();

        if (!code.trim()) {
            throw new Error("La URL no contiene código.");
        }

        // Mostrar código
        if (viewerCode) {
            viewerCode.textContent = code;
        }

        if (viewerName) {
            viewerName.textContent = "Código cargado";
        }

        if (viewerInfo) {
            viewerInfo.textContent =
                code.length.toLocaleString() +
                " caracteres";
        }

        if (viewer) {
            viewer.style.display = "block";
        }

        // Guardar temporalmente para copiar
        if (copyCodeButton) {
            copyCodeButton.dataset.code = code;
        }

        // Scroll al resultado
        if (viewer) {
            setTimeout(() => {
                viewer.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 100);
        }

    } catch (error) {
        console.error("Viewer error:", error);

        showError(
            "No se pudo cargar el código. La URL debe ser pública y permitir solicitudes desde Apex Raw."
        );

        if (viewer) {
            viewer.style.display = "none";
        }
    } finally {
        if (viewButton) {
            viewButton.disabled = false;
            viewButton.textContent = "Ver código";
        }
    }
}

// ======================================================
// COPIAR RAW URL
// ======================================================

async function copyRawURL() {
    const value = rawUrlInput
        ? rawUrlInput.value.trim()
        : "";

    if (!value) {
        showError("Primero publica un script.");
        return;
    }

    const success = await copyText(value);

    if (success && copyRawButton) {
        const oldText = copyRawButton.textContent;

        copyRawButton.textContent = "Copiado";

        setTimeout(() => {
            copyRawButton.textContent = oldText;
        }, 1500);
    }
}

// ======================================================
// COPIAR LOADSTRING
// ======================================================

async function copyLoadstring() {
    const value = loadstringInput
        ? loadstringInput.value.trim()
        : "";

    if (!value) {
        showError("Primero publica un script.");
        return;
    }

    const success = await copyText(value);

    if (success && copyLoadstringButton) {
        const oldText = copyLoadstringButton.textContent;

        copyLoadstringButton.textContent = "Copiado";

        setTimeout(() => {
            copyLoadstringButton.textContent = oldText;
        }, 1500);
    }
}

// ======================================================
// COPIAR CÓDIGO
// ======================================================

async function copyViewerCode() {
    let code = "";

    if (viewerCode) {
        code = viewerCode.textContent || "";
    }

    if (!code.trim() && copyCodeButton) {
        code = copyCodeButton.dataset.code || "";
    }

    if (!code.trim()) {
        showError("No hay código para copiar.");
        return;
    }

    const success = await copyText(code);

    if (success && copyCodeButton) {
        const oldText = copyCodeButton.textContent;

        copyCodeButton.textContent = "Copiado";

        setTimeout(() => {
            copyCodeButton.textContent = oldText;
        }, 1500);
    }
}

// ======================================================
// EVENTOS
// ======================================================

if (publishButton) {
    publishButton.addEventListener(
        "click",
        publishScript
    );
}

if (viewButton) {
    viewButton.addEventListener(
        "click",
        loadScriptFromURL
    );
}

if (copyRawButton) {
    copyRawButton.addEventListener(
        "click",
        copyRawURL
    );
}

if (copyLoadstringButton) {
    copyLoadstringButton.addEventListener(
        "click",
        copyLoadstring
    );
}

if (copyCodeButton) {
    copyCodeButton.addEventListener(
        "click",
        copyViewerCode
    );
}

// ======================================================
// ENTER / CTRL + ENTER
// ======================================================

if (urlInput) {
    urlInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            loadScriptFromURL();
        }
    });
}

// ======================================================
// INICIO
// ======================================================

console.log("Apex Raw iniciado.");
console.log("Supabase:", SUPABASE_URL);
console.log("Bucket:", BUCKET);