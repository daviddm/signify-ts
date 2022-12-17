import {Signer} from "./signer";

export {};
const { Matter, MtrDex } = require('./matter');
const { EmptyMaterialError } = require('./kering')
import libsodium  from 'libsodium-wrappers-sumo';

export const enum Tier {
    Low = "Low",
    Med = "Med",
    High = "High"
}

interface SalterArgs {
    raw?: Uint8Array | undefined
    code? :string
    tier?:string
    qb64b? :Uint8Array | undefined
    qb64?: string
    qb2?: Uint8Array | undefined
    strip?: boolean
}
export class Salter extends Matter {

    constructor({raw, code = MtrDex.Salt_128, tier=Tier.Low, qb64, qb64b, qb2, strip=false}:SalterArgs) {
        try {
            super({raw, code, qb64, qb64b, qb2, strip});
        } catch (e) {
            if(e instanceof EmptyMaterialError) {
                if (code == MtrDex.Salt_128) {
                    let salt = libsodium.randombytes_buf(libsodium.crypto_pwhash_SALTBYTES);
                    super({raw: salt, code: code})
                } else {
                    throw new Error("invalid code for Salter, only Salt_128 accepted")
                }
            } else {
                throw e;
            }
        }

        if (this.code != MtrDex.Salt_128) {
            throw new Error("invalid code for Salter, only Salt_128 accepted")
        }

        this.tier = tier !== null ? tier : Tier.Low
    }

    private stretch(size: number = 32, path: string = "", tier: Tier | null = null, temp: boolean = false): Uint8Array {
        tier = tier == null ? this.tier : tier;

        let opslimit: number, memlimit: number

        if (temp) {
            opslimit = libsodium.crypto_pwhash_OPSLIMIT_MIN
            memlimit = libsodium.crypto_pwhash_MEMLIMIT_MIN

        } else {
            switch (tier) {
                case Tier.Low:
                    opslimit = libsodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
                    memlimit = libsodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
                    break;
                case Tier.Med:
                    opslimit = libsodium.crypto_pwhash_OPSLIMIT_MODERATE
                    memlimit = libsodium.crypto_pwhash_MEMLIMIT_MODERATE
                    break;
                case Tier.High:
                    opslimit = libsodium.crypto_pwhash_OPSLIMIT_SENSITIVE
                    memlimit = libsodium.crypto_pwhash_MEMLIMIT_SENSITIVE
                    break;
                default:
                    throw new Error(`Unsupported security tier = ${tier}.`)
            }
        }

        return libsodium.crypto_pwhash(size, path, this.raw, opslimit, memlimit, libsodium.crypto_pwhash_ALG_DEFAULT)
    }

    signer(code: string=MtrDex.Ed25519_Seed, transferable: boolean=true, path: string = "",
           tier: Tier | null = null, temp:boolean = false): Signer {
        let seed = this.stretch(Matter._rawSize(code), path, tier, temp)

        return new Signer({raw: seed, code: code, transferable: transferable})
    }

}