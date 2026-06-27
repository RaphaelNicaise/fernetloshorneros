declare module 'mysqldump' {
  const mysqldump: (options: any) => Promise<any>;
  export default mysqldump;
}
