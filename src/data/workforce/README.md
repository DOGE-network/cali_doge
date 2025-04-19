# Example commands

to tar groups of files
- `find . -type f -name "*2021*" -print0 | tar -cvf 2021-files.tar --null -T -`