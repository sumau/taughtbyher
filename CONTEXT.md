# Well Tutored

A public directory of tutors and the teaching resources they write, plus a
private area where those tutors maintain their own profiles and content. One
vocabulary is shared by every package in this workspace.

## Language

### The public site

**Tutor**:
A person offering tuition, with a profile in the directory. A Tutor is `draft`,
`published` or `archived`; only a published Tutor appears publicly.
_Avoid_: Teacher, instructor, coach

**Tutor Profile Draft**:
Unpublished edits to a Tutor's profile, held separately from the published
profile so that editing never changes what visitors see.
_Avoid_: Revision, pending profile, version

**Directory**:
The public listing of published Tutors.
_Avoid_: Listing, search, index

**Resource**:
A piece of teaching material written by a Tutor and read by visitors. A
Resource is `draft` or `published`.
_Avoid_: Article, post, content, material

**Enquiry**:
A message sent by a visitor to a Tutor through the public site. The main thing
a visitor does, and the only way an unauthenticated person writes to the
system.
_Avoid_: Contact, lead, message, request

**Availability**:
Whether a Tutor is `accepting`, `limited` or `unavailable` for new students.
Distinct from whether their profile is published.

### The private area

**Workspace**:
The private, authenticated area where Tutors and the Owner manage profiles and
Resources.
_Avoid_: Studio, admin, dashboard, back office, CMS

**Workspace Account**:
A signed-in person's record, distinct from the Tutor profile it may be linked
to. One person can hold an account without being a Tutor.
_Avoid_: User, member, profile

**Role**:
A Workspace Account is `owner`, `tutor` or `pending`. A new account is
`pending` until promoted.

**Owner**:
The single Workspace Account with the `owner` role, who promotes other
accounts. There is exactly one.
_Avoid_: Admin, superuser, root

**Saved Resource**:
A Resource bookmarked by a Workspace Account.
_Avoid_: Favourite, bookmark, pin

### Delivery

**Deployment**:
The running instance serving the site — one origin serving both the frontend
and the API.
_Avoid_: Publish, publication, the app, the environment

**Deploy**:
The act of shipping the current `main` to the Deployment.
_Avoid_: Publish, ship, release, launch

**Launch Smoke**:
The check that a Deployment is *usable* — it has a published Tutor, a
published Resource, its pages render, and an Enquiry can be submitted. A
successful Deploy does not imply a passing Launch Smoke; they assert different
things.
_Avoid_: Health check, published smoke
