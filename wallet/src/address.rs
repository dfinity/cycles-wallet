use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use serde::export::Formatter;
use serde::Deserialize;
use std::cmp::Ordering;
use std::collections::BTreeSet;

#[derive(Clone, Debug, Ord, PartialOrd, Eq, PartialEq, CandidType, Deserialize)]
pub enum Role {
    Contact,
    Custodian,
    Controller,
}

/// An entry in the address book. It must have an ID and a role.
#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct AddressEntry {
    pub id: Principal,
    pub name: Option<String>,
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
    pub fn create(id: Principal, name: Option<String>, role: Role) -> AddressEntry {
        AddressEntry { id, name, role }
    }

    pub fn is_controller(&self) -> bool {
        self.role == Role::Controller
    }

    pub fn is_custodian(&self) -> bool {
        self.role == Role::Controller || self.role == Role::Custodian
    }
}

/// The address book for this wallet.
#[derive(Default, Clone)]
pub struct AddressBook(BTreeSet<AddressEntry>);

impl AddressBook {
    #[inline]
    pub fn add(&mut self, entry: AddressEntry) {
        if let Some(mut existing) = self.0.take(&entry) {
            if entry.name.is_some() {
                existing.name = entry.name;
            }
            if entry.role > existing.role {
                existing.role = entry.role;
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
        self.0.remove(&AddressEntry::create(
            principal.clone(),
            None,
            Role::Contact,
        ));
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
        book.add(AddressEntry::create(
            Principal::anonymous(),
            None,
            Role::Contact,
        ));
        book.add(AddressEntry::create(
            Principal::anonymous(),
            None,
            Role::Controller,
        ));
        assert!(book.is_controller(&Principal::anonymous()));
    }
}
