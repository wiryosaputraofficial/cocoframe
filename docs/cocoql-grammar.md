# CocoQL 0.1 Grammar

The notation below describes the implemented read grammar.

```text
query       = newlines, from, newlines, { with, newlines }, { filter, newlines },
              { group, newlines }, select, newlines, { sort, newlines }, [ take, newlines ],
              [ skip, newlines ], EOF ;
from        = "from", word, line-end ;
with        = "with", relation-path, line-end ;
filter      = "filter", field, operator, value, line-end ;
group       = "group", field, line-end ;
select      = "select", select-list ;
sort        = "sort", field, ("asc" | "desc"), line-end ;
take        = "take", integer, line-end ;
skip        = "skip", integer, line-end ;
select-list = select-item, { (newline | ","), select-item } ;
select-item = field | aggregate ;
aggregate   = aggregate-function, "(", field, ")", "as", word ;
aggregate-function = "count" | "sum" | "avg" | "min" | "max" ;
field       = word, { ".", word } ;
relation-path = word, { ".", word } ;
operator    = "=" | "!=" | ">" | ">=" | "<" | "<=" |
              "in" | "not", "in" | "contains" | "starts_with" |
              "ends_with" | "before" | "after" ;
value       = scalar | "[", scalar, { ",", scalar }, "]" |
              semantic-date ;
semantic-date = named-date | ("last" | "next"), integer, ("day" | "days") ;
named-date  = "today" | "yesterday" | "this_week" | "last_week" |
              "this_month" | "last_month" | "this_year" | "last_year" ;
scalar      = string | number | "true" | "false" | "null" | word ;
```

The parser rejects unknown commands and punctuation. It does not guess missing
relations, fields, operators, or mutation intent.
