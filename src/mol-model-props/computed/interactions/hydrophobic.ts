/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author Fred Ludlow <Fred.Ludlow@astx.com>
 *
 * based in part on NGL (https://github.com/arose/ngl)
 */

import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { Structure, Unit, StructureElement } from '../../../mol-model/structure';
import { FeaturesBuilder, Features } from './features';
import { typeSymbol, eachBondedAtom } from '../chemistry/util';
import { Elements } from '../../../mol-model/structure/model/properties/atomic/types';
import { FeatureType, FeatureGroup, InteractionType } from './common';
import { LinkProvider } from './links';

export const HydrophobicParams = {
    distanceMax: PD.Numeric(4.0, { min: 1, max: 5, step: 0.1 }),
}
export type HydrophobicParams = typeof HydrophobicParams
export type HydrophobicProps = PD.Values<HydrophobicParams>

/**
 * Hydropbobic atoms
 * - Carbon only bonded to carbon or hydrogen
 * - Fluorine
 */
export function addHydrophobicAtom(structure: Structure, unit: Unit.Atomic, builder: FeaturesBuilder) {
    const { elements } = unit
    const { x, y, z } = unit.model.atomicConformation

    for (let i = 0 as StructureElement.UnitIndex, il = elements.length; i < il; ++i) {
        const element = typeSymbol(unit, i)
        let flag = false
        if (element === Elements.C) {
            flag = true
            eachBondedAtom(structure, unit, i, (unitB, indexB) => {
                const elementB = typeSymbol(unitB, indexB)
                if (elementB !== Elements.C && elementB !== Elements.H) flag = false
            })
        } else if (element === Elements.F) {
            flag = true
        }

        if (flag) {
            builder.add(FeatureType.HydrophobicAtom, FeatureGroup.None, x[elements[i]], y[elements[i]], z[elements[i]], i)
        }
    }
}

function isHydrophobicContact (ti: FeatureType, tj: FeatureType) {
    return ti === FeatureType.HydrophobicAtom && tj === FeatureType.HydrophobicAtom
}

function testHydrophobic(structure: Structure, infoA: Features.Info, infoB: Features.Info, distanceSq: number): InteractionType | undefined {
    const typeA = infoA.types[infoA.feature]
    const typeB = infoB.types[infoB.feature]

    if (!isHydrophobicContact(typeA, typeB)) return

    const indexA = infoA.members[infoA.offsets[infoA.feature]]
    const indexB = infoB.members[infoB.offsets[infoB.feature]]
    if (typeSymbol(infoA.unit, indexA) === Elements.F && typeSymbol(infoB.unit, indexB) === Elements.F) return

    return InteractionType.Hydrophobic
}

//

export const HydrophobicAtomProvider = { type: FeatureType.HydrophobicAtom, add: addHydrophobicAtom }

export const HydrophobicProvider: LinkProvider<HydrophobicParams> = {
    name: 'hydrophobic',
    params: HydrophobicParams,
    requiredFeatures: [FeatureType.HydrophobicAtom],
    createTester: (props: HydrophobicProps) => {
        return {
            maxDistanceSq: props.distanceMax * props.distanceMax,
            getType: (structure, infoA, infoB, distanceSq) => testHydrophobic(structure, infoA, infoB, distanceSq)
        }
    }
}