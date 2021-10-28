# `modular typecheck`

`modular typecheck` will programmatically report the semantic, syntactic, and
declaration type errors found in your code, based on your tsconfig.json.

In a CI environment, it will print condensed errors if they are present.

In non-CI environments, it will print the full details of the error, line, and
small snapshot of the offending line in question.
