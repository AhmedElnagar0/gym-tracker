// Generated migrations import .sql files; babel-plugin-inline-import turns them into strings.
declare module '*.sql' {
  const content: string;
  export default content;
}
