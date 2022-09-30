This monorepository has inter-workspace dependencies:

```mermaid
graph TD;
    app-->a;
    a-->b;
    a-->c;
    b-->c;
    c-->d;
    e-->a;
```
