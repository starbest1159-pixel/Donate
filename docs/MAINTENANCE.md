# Maintenance & Branch strategy

แนะนำ workflow
- Branch naming: feature/<name>, fix/<name>, chore/<name>, patch/<yourname>-patch-1
- ก่อนลบ branch ให้ตรวจว่า merged หรือไม่:
  - ตรวจ PR ว่า merged แล้วหรือ `git branch -r --merged origin/main`
- Auto-delete branches: enable in GitHub settings หรือรัน script
- CI: ตั้ง actions ให้รัน tests + lint ก่อน merge

Branch cleanup script (ตัวอย่าง)
```bash
git fetch --prune
git branch -r --merged origin/main | sed 's|origin/||' | egrep -v '^(main|master|develop|HEAD)$'
# ตรวจผลก่อนลบจริง
```
