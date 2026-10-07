/* Images are bundled by @wordpress/scripts' asset/resource rule; the import is their URL. */
declare module '*.webp' {
    const url: string;
    export default url;
}
