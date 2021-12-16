use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use serde::Deserialize;
use std::cmp::Ordering;
use std::collections::BTreeSet;
use std::fmt::Formatter;

/// The role of the address, whether it's a [Contact], [Custodian], or a [Controller]. A
/// [Controller] is the most privileged role, and can rename the wallet, add entries to the
/// address book. A [Custodian] can access the wallet information, send cycles, forward
/// calls, and create canisters.
///
/// A [Contact] is simply a way to name canisters, and can be seen as a crude address book.
///
/// TODO: add support for an address book in the frontend when sending cycles.
#[derive(Clone, Debug, Ord, PartialOrd, Eq, PartialEq, CandidType, Deserialize)]
pub enum Role {
    Contact,
    Custodian,
    Controller,
}

/// The kind of address, whether it's a user or canister, and whether it's known.
#[derive(Copy, Clone, Debug, Ord, PartialOrd, Eq, PartialEq, CandidType, Deserialize)]
pub enum Kind {
    Unknown,
    User,
    Canister,
}

/// An entry in the address book. It must have an ID and a role.
#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct AddressEntry {
    /// The canister ID.
    pub id: Principal,
    /// An optional name for this address.
    pub name: Option<String>,
    /// The kind of address (whether it is a known canister or user).
    pub kind: Kind,
    /// The role this address has on the wallet.
    pub role: Role,
}

impl PartialOrd for AddressEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for AddressEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        self.id.cmp(&other.id)
    }
}

impl PartialEq for AddressEntry {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl AddressEntry {
    pub fn new(id: Principal, name: Option<String>, role: Role) -> AddressEntry {
        AddressEntry {
            id,
            name,
            role,
            kind: Kind::Unknown,
        }
    }

    pub fn is_controller(&self) -> bool {
        self.role == Role::Controller
    }

    pub fn is_custodian(&self) -> bool {
        self.role == Role::Custodian
    }

    pub fn is_controller_or_custodian(&self) -> bool {
        self.role == Role::Controller || self.role == Role::Custodian
    }
}

/// The address book for this wallet.
#[derive(Default, Clone)]
pub struct AddressBook(BTreeSet<AddressEntry>);

impl AddressBook {
    #[inline]
    pub fn insert(&mut self, entry: AddressEntry) {
        if let Some(mut existing) = self.0.take(&entry) {
            if entry.name.is_some() {
                existing.name = entry.name;
            }
            if entry.role > existing.role {
                existing.role = entry.role;
            }
            if !matches!(entry.kind, Kind::Unknown) {
                existing.kind = entry.kind;
            }
            self.0.insert(existing);
        } else {
            self.0.insert(entry);
        }
    }

    #[inline]
    pub fn find(&self, id: &Principal) -> Option<&AddressEntry> {
        for a in &self.0 {
            if &a.id == id {
                return Some(a);
            }
        }

        None
    }

    #[inline]
    pub fn remove(&mut self, principal: &Principal) {
        // Because we order by ID, we can create entries and remove them.
        self.0
            .remove(&AddressEntry::new(*principal, None, Role::Contact));
    }

    #[inline]
    pub fn take(&mut self, principal: &Principal) -> Option<AddressEntry> {
        // Because we order by ID, we can create entries and remove them.
        self.0
            .take(&AddressEntry::new(*principal, None, Role::Contact))
    }

    #[inline]
    pub fn is_custodian(&self, principal: &Principal) -> bool {
        self.find(principal).map_or(false, |e| e.is_custodian())
    }

    #[inline]
    pub fn is_controller(&self, principal: &Principal) -> bool {
        self.find(principal).map_or(false, |e| e.is_controller())
    }

    #[inline]
    pub fn is_controller_or_custodian(&self, principal: &Principal) -> bool {
        self.find(principal)
            .map_or(false, |e| e.is_controller_or_custodian())
    }

    #[inline]
    pub fn custodians(&self) -> impl Iterator<Item = &AddressEntry> {
        self.iter().filter(|e| e.is_custodian())
    }

    #[inline]
    pub fn controllers(&self) -> impl Iterator<Item = &AddressEntry> {
        self.iter().filter(|e| e.is_controller())
    }

    #[inline]
    pub fn iter(&self) -> impl Iterator<Item = &AddressEntry> {
        self.0.iter()
    }
}

impl std::fmt::Debug for AddressBook {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("AddressBook").field(&self.0).finish()
    }
}

#[cfg(test)]
mod tests {
    use crate::address::{AddressBook, AddressEntry, Role};
    use ic_cdk::export::Principal;

    #[test]
    fn can_update_existing() {
        let mut book: AddressBook = Default::default();
        book.insert(AddressEntry::new(
            Principal::anonymous(),
            None,
            Role::Contact,
        ));
        book.insert(AddressEntry::new(
            Principal::anonymous(),
            None,
            Role::Controller,
        ));
        assert!(book.is_controller(&Principal::anonymous()));
    }
}
