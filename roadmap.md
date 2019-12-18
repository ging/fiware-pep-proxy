# Wilma PEP Proxy GE Roadmap

This product is a FIWARE Generic Enabler. If you would like to learn about the overall Roadmap of FIWARE, please check
section "Roadmap" on the [FIWARE Catalogue](https://github.com/Fiware/catalogue).

## Introduction

This section elaborates on proposed new features or tasks which are expected to be added to the product in the
foreseeable future. There should be no assumption of a commitment to deliver these features on specific dates or in the
order given. The development team will be doing their best to follow the proposed dates and priorities, but please bear
in mind that plans to work on a given feature or task may be revised. All information is provided as a general
guidelines only, and this section may be revised to provide newer information at any time.

## Short term

The following list of features are planned to be addressed in the short term, and incorporated in the next release of
the product:

-   There are no new features planned for the next release.

-   OpenID Connect: Keyrock GE will implement support to OpenID Connect for creating _id_tokens_. Wilma will support
    these tokens for validating users identity.

## Medium term

The following list of features are planned to be addressed in the medium term, typically within the subsequent
release(s) generated in the next 9 months after next planned release:

-   Unit tests: to be run in CI

-   COAP compatibility: supporting this protocol as an alternative of HTTP could improve the performance of IoT devices
    authentication process.

-   Integration with Context Broker Service Path: to support a better integration of authorization mechanisms with
    Context Broker, requests will take into account the CB service path in HTTP headers.

## Long term

The following list of features are proposals regarding the longer-term evolution of the product even though development
of these features has not yet been scheduled for a release in the near future. Please feel free to contact us if you
wish to get involved in the implementation or influence the roadmap

-   Integration with API management tools: in the same way the logic of Wilma is available in API Umbrella, the
    implementation in other tools such us KONG and/or Proxy42 will be studied.
