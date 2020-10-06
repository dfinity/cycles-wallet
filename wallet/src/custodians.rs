use ic_types::Principal;
use std::collections::BTreeSet;

/// Our set of custodians for this wallet.
#[derive(Clone)]
pub struct CustodianSet {
    controller: Principal,
    custodians: BTreeSet<Principal>,
}

impl Default for CustodianSet {
    fn default() -> Self {
        Self {
            controller: Principal::management_canister(),
            custodians: BTreeSet::new(),
        }
    }
}

impl CustodianSet {
    #[inline]
    pub fn add_custodian(&mut self, principal: Principal) {
        self.custodians.insert(principal);
    }

    #[inline]
    pub fn remove_custodian(&mut self, principal: Principal) {
        self.custodians.remove(&principal);
    }

    #[inline]
    pub fn is_custodian(&self, principal: &Principal) -> bool {
        self.custodians.contains(principal) || &self.controller == principal
    }

    #[inline]
    pub fn custodians(&self) -> impl Iterator<Item = &Principal> {
        self.custodians.iter()
    }

    #[inline]
    pub fn set_controller(&mut self, principal: Principal) {
        self.controller = principal;
    }

    #[inline]
    pub fn get_controller(&self) -> &Principal {
        &self.controller
    }

    #[inline]
    pub fn is_controller(&self, principal: &Principal) -> bool {
        &self.controller == principal
    }
}
