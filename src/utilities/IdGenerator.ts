export class IdGenerator {
    public static generate(prefix: string): string {
        const timestamp = Date.now().toString(36);
        const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, "");

        const buffer = new Uint8Array(6);
        globalThis.crypto.getRandomValues(buffer);

        const randomPart = Array.from(buffer)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .slice(10);

        return `${cleanPrefix}_${timestamp}${randomPart}`;
    }
}
